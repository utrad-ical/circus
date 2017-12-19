import status from 'http-status';
import performSearch from '../performSearch';
import { generateCaseId } from '../../utils';


export const handleGet = () => {
	return async (ctx, next) => {
		const aCase = ctx.case;
		delete aCase.latestRevision; // Remove redundant data
		ctx.body = aCase;
	};
};

async function makeNewCase(models, user, userPrivileges, project, series, tags) {
	const caseId = generateCaseId();

	let patientInfoCache = null;
	const seriesData = [];
	const domains = {};

	// Check write access for the project.
	const ok = userPrivileges.accessibleProjects.some(
		p => (p.roles.indexOf('write') >= 0 && p.projectId === project.projectId)
	);
	if (!ok) {
		throw new Error('You do not have write privilege for this project.');
	}

	// Check domain.
	for (const suid of series) {
		const item = await models.series.findById(suid);
		if (!item) {
			throw new Error('Nonexistent series.');
		}
		seriesData.push(item);
		if (userPrivileges.domains.indexOf(item.domain) < 0) {
			throw new Error('You cannot access this series.');
		}
		if (!patientInfoCache) {
			patientInfoCache = item.patientInfo;
		}
		domains[item.domain] = true;
	}

	const revision = {
		creator: user.userEmail,
		date: new Date(),
		description: 'Created new case.',
		attributes: {},
		status: 'draft',
		series: seriesData.map(s => ({
			seriesUid: s.seriesUid,
			images: s.images,
			labels: []
		}))
	};

	await models.clinicalCase.insert({
		caseId,
		projectId: project.projectId,
		patientInfoCache,
		tags,
		latestRevision: revision,
		revisions: [revision],
		domains: Object.keys(domains)
	});
	return caseId;
}

export const handlePost = ({ models }) => {
	return async (ctx, next) => {
		const project = await models.project.findByIdOrFail(ctx.request.body.projectId);
		const caseId = await makeNewCase(
			models,
			ctx.user,
			ctx.userPrivileges,
			project,
			ctx.request.body.series,
			ctx.request.body.tags
		);
		ctx.body = { caseId };
	};
};

export const handlePostRevision = ({ models }) => {
	return async (ctx, next) => {
		const aCase = ctx.case;
		const rev = ctx.request.body;

		if (rev.date) { ctx.throw(status.BAD_REQUEST, 'You cannot specify revision date.'); }
		if (rev.creator) { ctx.throw(status.BAD_REQUEST, 'You cannot specify revision creator.'); }

		rev.date = new Date();
		rev.creator = ctx.user.userEmail;

		await models.clinicalCase.modifyOne(aCase.caseId, {
			latestRevision: rev,
			revisions: [
				...aCase.revisions,
				rev
			]
		});
		ctx.body = null; // No Content
	};
};

export const handleSearch = ({ models }) => {
	return async (ctx, next) => {
		const urlQuery = ctx.request.query;
		let customFilter;
		try {
			customFilter = urlQuery.filter ? JSON.parse(urlQuery.filter) : {};
		} catch (err) {
			ctx.throw(status.BAD_REQUEST, 'Bad filter.');
		}
		const domainFilter = {};
		const filter = { $and: [customFilter, domainFilter]};
		const transform = caseData => {
			delete caseData.revisions;
			return caseData;
		};

		await performSearch(models.clinicalCase, filter, ctx, { transform });
	};
};