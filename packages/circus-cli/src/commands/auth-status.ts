import { styleText } from 'node:util';
import { z } from 'zod';
import { loadCliConnection } from '../utils/cliConfig.ts';
import { fetchAuthInfo } from '../utils/fetchAuthInfo.ts';
import type { CommandAction } from './CommandAction.ts';

const loginInfo = z.object({
  loginId: z.string(),
  userEmail: z.string(),
  domains: z.array(z.string()),
  accessibleProjects: z.array(
    z.object({
      projectId: z.string(),
      roles: z.array(z.string()),
      project: z.object({ projectName: z.string() })
    })
  ),
  accessiblePlugins: z.array(
    z.object({
      pluginId: z.string(),
      roles: z.array(z.string()),
      plugin: z.object({ pluginName: z.string(), version: z.string() })
    })
  )
});

const formatAccess = (name: string, id: string, roles: string[]) => {
  const formattedName = styleText('bold', name);
  const formattedId = styleText('dim', `(${id})`);
  const formattedRoles = roles.length
    ? styleText('green', roles.join(', '))
    : styleText('dim', 'None');
  return `${formattedName} ${formattedId} — ${formattedRoles}`;
};

const action: CommandAction = ({ configPath }) => {
  return async () => {
    const connection = loadCliConnection(configPath);
    if (!connection) {
      console.log(
        'Not logged in. Run "circus-cli auth login" to save a connection.'
      );
      return;
    }
    const { endpoint, token } = connection;
    const info = await fetchAuthInfo(
      endpoint,
      'login-info/full',
      loginInfo,
      token
    );
    const domains = info.domains;
    const projects = info.accessibleProjects.map(
      ({ projectId, roles, project }) =>
        formatAccess(project.projectName, projectId, roles)
    );
    const plugins = info.accessiblePlugins.map(({ pluginId, roles, plugin }) =>
      formatAccess(`${plugin.pluginName} v${plugin.version}`, pluginId, roles)
    );
    const lines = [
      ['API endpoint', endpoint],
      ['Login ID', info.loginId],
      ['Email', info.userEmail]
    ].map(([label, value]) => `${styleText('cyan', `${label}:`)} ${value}`);
    for (const [heading, entries] of [
      ['Domains', domains],
      ['Projects', projects],
      ['Plug-ins', plugins]
    ] as const) {
      lines.push(styleText(['bold', 'cyan'], `${heading}:`));
      if (!entries.length) lines.push('  ' + styleText('dim', 'None'));
      for (const entry of entries) lines.push(`  - ${entry}`);
    }
    console.log(lines.join('\n'));
  };
};

export default action;
