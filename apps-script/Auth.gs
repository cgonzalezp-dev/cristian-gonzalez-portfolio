/**
 * Auth.gs
 * -----------------------------------------------------------------------------
 * Identity and role resolution.
 *
 * Roles are resolved from the dimension tables rather than a separate ACL:
 * anyone listed as a manager gets MANAGER, anyone in the admin list gets ADMIN,
 * everyone else gets the configured default. One less thing to keep in sync.
 *
 * NOTE ON SCOPE: this authorises features, not rows. Google Sheets has no
 * row-level access control, so a user who can open the underlying spreadsheet
 * can read every row in it regardless of what this module says. Where the data
 * is sensitive, the spreadsheet itself must not be shared — the web app should
 * be deployed "execute as me" so only the app account can read the sheet.
 */

const Auth = (function () {

  let cachedUser = null;

  /** @return {string} email, or 'unknown' when the session cannot be resolved. */
  function currentUser() {
    if (cachedUser !== null) return cachedUser;
    try {
      cachedUser = Session.getActiveUser().getEmail() ||
                   Session.getEffectiveUser().getEmail() || 'unknown';
    } catch (e) {
      cachedUser = 'unknown';
    }
    return cachedUser;
  }

  /** @return {string} ROLE */
  function role() {
    const email = currentUser().toLowerCase();

    const admins = String(ConfigService.getSetting('admin_emails') || '')
      .split(',').map(function (s) { return s.trim().toLowerCase(); })
      .filter(Boolean);
    if (admins.indexOf(email) >= 0) return ROLE.ADMIN;

    // First run: nobody is configured yet, so the deploying user is the admin.
    if (!admins.length) return ROLE.ADMIN;

    const isManager = ConfigService.listDimension(TABLE.MANAGER, true)
      .some(function (m) { return String(m.email).toLowerCase() === email; });
    if (isManager) return ROLE.MANAGER;

    return String(ConfigService.getSetting('default_role') || ROLE.VIEWER);
  }

  const CAPABILITIES = {
    [ROLE.ADMIN]:   ['config', 'entry', 'approve', 'analytics', 'admin', 'export'],
    [ROLE.MANAGER]: ['entry', 'analytics', 'export'],
    [ROLE.ANALYST]: ['entry', 'analytics', 'export'],
    [ROLE.VIEWER]:  ['analytics']
  };

  function can(capability) {
    return (CAPABILITIES[role()] || []).indexOf(capability) >= 0;
  }

  /** Throw unless the caller holds a capability. Used at the API boundary. */
  function require(capability) {
    if (!can(capability)) {
      throw new AppError('FORBIDDEN',
        'You do not have permission to do that. Ask an administrator for access.');
    }
    return true;
  }

  /**
   * The manager record for the current user, when they are one. Manager views
   * default to their own team rather than the whole company.
   */
  function currentManager() {
    const email = currentUser().toLowerCase();
    return ConfigService.listDimension(TABLE.MANAGER, false)
      .filter(function (m) { return String(m.email).toLowerCase() === email; })[0] || null;
  }

  function context() {
    const r = role();
    const mgr = currentManager();
    return {
      email: currentUser(),
      role: r,
      capabilities: CAPABILITIES[r] || [],
      manager_id: mgr ? mgr.manager_id : '',
      manager_name: mgr ? mgr.manager_name : ''
    };
  }

  return {
    currentUser: currentUser, role: role, can: can, require: require,
    currentManager: currentManager, context: context
  };
})();
