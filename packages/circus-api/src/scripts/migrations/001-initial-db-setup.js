import { generateProjectId } from '../../utils';
import nodepass from 'node-php-password';

export async function up(db, models) {
	const projectId = generateProjectId();

	await db.collection('groups').ensureIndex({ groupId: 1 }, { unique: true });
	await models.group.insertMany([{
		groupId: 1,
		groupName: 'admin',
		privileges: ['createProject', 'deleteProject', 'manageServer', 'personalInfoView'],
		domains: ['default'],
		readProjects: [projectId],
		writeProjects: [projectId],
		addSeriesProjects: [projectId],
		viewPersonalInfoProjects: [projectId],
		moderateProjects: [projectId]
	}, {
		groupId: 2,
		groupName: 'user',
		privileges: ['personalInfoView'],
		domains: ['default'],
		readProjects: [projectId],
		writeProjects: [projectId],
		addSeriesProjects: [projectId],
		viewPersonalInfoProjects: [projectId],
		moderateProjects: []
	}]);

	await db.collection('users').ensureIndex({ userEmail: 1 }, { unique: true });
	await models.user.insert({
		userEmail: 'circus@circus.example.com',
		loginId: 'circus',
		password: nodepass.hash('circus'),
		groups: [1],
		lastLoginTime: new Date(),
		lastLoginIp: '',
		description: 'Default administrative user',
		loginEnabled: true,
		preferences: { theme: 'mode_white', personalInfoView: true }
	});

	await db.collection('projects').ensureIndex({ projectId: 1 }, { unique: true });
	await models.project.insert({
		projectId,
		projectName: 'default',
		description: 'The default DB project',
		windowPriority: 'dicom,auto',
		windowPresets: [],
		tags: [],
		caseAttributesSchema: [],
		labelAttributesSchema: []
	});

	await models.serverParam.insert({
		key: 'domains',
		value: ['default']
	});

}