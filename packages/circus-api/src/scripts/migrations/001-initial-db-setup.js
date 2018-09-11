import { generateUniqueId } from '../../utils';
import nodepass from 'node-php-password';

export async function up(db, models) {
  const projectId = generateUniqueId();

  await db.collection('groups').ensureIndex({ groupId: 1 }, { unique: true });
  await db.collection('groups').insertMany([
    {
      groupId: await models.group.newSequentialId(),
      groupName: 'admin',
      privileges: [
        'createProject',
        'deleteProject',
        'manageServer',
        'personalInfoView'
      ],
      domains: ['default'],
      readProjects: [projectId],
      writeProjects: [projectId],
      addSeriesProjects: [projectId],
      viewPersonalInfoProjects: [projectId],
      moderateProjects: [projectId],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      groupId: await models.group.newSequentialId(),
      groupName: 'user',
      privileges: ['personalInfoView'],
      domains: ['default'],
      readProjects: [projectId],
      writeProjects: [projectId],
      addSeriesProjects: [projectId],
      viewPersonalInfoProjects: [projectId],
      moderateProjects: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]);

  await db.collection('users').ensureIndex({ userEmail: 1 }, { unique: true });
  await db.collection('users').insert({
    userEmail: 'circus@circus.example.com',
    loginId: 'circus',
    password: nodepass.hash('circus'),
    groups: [1],
    lastLoginTime: new Date(),
    lastLoginIp: '',
    description: 'Default administrative user',
    loginEnabled: true,
    preferences: { theme: 'mode_white', personalInfoView: true },
    createdAt: new Date(),
    updatedAt: new Date()
  });

  await db
    .collection('projects')
    .ensureIndex({ projectId: 1 }, { unique: true });
  await db.collection('projects').insert({
    projectId,
    projectName: 'default',
    description: 'The default DB project',
    windowPriority: 'dicom,auto',
    windowPresets: [],
    tags: [],
    caseAttributesSchema: [],
    labelAttributesSchema: [],
    createdAt: new Date(),
    updatedAt: new Date()
  });

  await db.collection('serverParams').insert({
    key: 'domains',
    value: ['default'],
    createdAt: new Date(),
    updatedAt: new Date()
  });
}
