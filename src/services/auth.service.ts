import prisma from '@/lib/db/prisma';
import { PasswordService } from '@/lib/auth/password';
import { SessionService } from '@/lib/auth/session';

export class AuthService {
  public static async authenticateAdmin(username: string, passwordPlain: string) {
    if (!username || !passwordPlain) {
      return { success: false, error: 'Username and password are required' };
    }

    const admin = await prisma.adminUser.findUnique({
      where: { username: username.trim() },
    });

    if (!admin) {
      return { success: false, error: 'Invalid administrator credentials' };
    }

    const valid = await PasswordService.verifyPassword(passwordPlain, admin.passwordHash);
    if (!valid) {
      return { success: false, error: 'Invalid administrator credentials' };
    }

    // Update lastLoginAt
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        adminUserId: admin.id,
        action: 'ADMIN_LOGIN',
        entityType: 'AdminUser',
        entityId: admin.id,
        details: JSON.stringify({ username: admin.username, timestamp: new Date().toISOString() }),
      },
    });

    const token = await SessionService.createToken(admin.id, admin.username);

    return {
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        lastLoginAt: admin.lastLoginAt,
      },
    };
  }

  public static async changePassword(adminId: string, currentPass: string, newPass: string) {
    const admin = await prisma.adminUser.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      return { success: false, error: 'Administrator account not found' };
    }

    const valid = await PasswordService.verifyPassword(currentPass, admin.passwordHash);
    if (!valid) {
      return { success: false, error: 'Current password is incorrect' };
    }

    if (newPass.length < 8) {
      return { success: false, error: 'New password must be at least 8 characters long' };
    }

    const newHash = await PasswordService.hashPassword(newPass);

    await prisma.adminUser.update({
      where: { id: adminId },
      data: { passwordHash: newHash },
    });

    await prisma.auditLog.create({
      data: {
        adminUserId: admin.id,
        action: 'PASSWORD_CHANGED',
        entityType: 'AdminUser',
        entityId: admin.id,
        details: 'Administrator password successfully updated',
      },
    });

    return { success: true };
  }
}
