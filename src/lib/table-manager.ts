type ManagerIdentity = { id: string; email: string | null };

export function isTableManager(user: ManagerIdentity | null | undefined) {
  const configuredId = process.env.TABLE_MANAGER_USER_ID?.trim();
  const configuredEmail = process.env.TABLE_MANAGER_EMAIL?.trim().toLowerCase();
  return Boolean(
    configuredId &&
      configuredEmail &&
      user?.id === configuredId &&
      user.email?.trim().toLowerCase() === configuredEmail,
  );
}