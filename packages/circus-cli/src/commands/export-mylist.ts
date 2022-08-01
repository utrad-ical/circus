import createSpinner from '../utils/createSpinner.js';
import CommandAction from './CommandAction.js';

const resourceTypes = ['series', 'clinicalCases', 'pluginJobs'];
type ResourceType = typeof resourceTypes[number];

const idNames: Record<ResourceType, string> = {
  series: 'seriesUid',
  clinicalCases: 'caseId',
  pluginJobs: 'jobId'
};

const endPoints: Record<ResourceType, string> = {
  series: 'series',
  clinicalCases: 'cases',
  pluginJobs: 'plugin-jobs'
};

interface MyList {
  myListId: string;
  resourceType: ResourceType;
  name: string;
}

const limit = 100; // fetches per page

const action: CommandAction = ({ getFetch }) => {
  return async (myListId: string, options: { type: ResourceType }) => {
    const fetch = getFetch();
    const ids: string[] = [];
    const spinner = createSpinner("Fetching user's my lists...");
    let page = 1;

    try {
      // Fetch all my lists.
      const myLists = (await (await fetch(`mylists`)).json()) as MyList[];

      if (typeof myListId !== 'string' || myListId.length === 0) {
        spinner.stop('Done');
        const dispList = myLists
          .map(l => ({
            myListId: l.myListId,
            resourceType: l.resourceType,
            name: l.name
          }))
          .sort((a, b) => a.resourceType.localeCompare(b.resourceType));
        if (dispList.length === 0) {
          console.log('This user has no my lists.');
        } else {
          console.table(dispList);
        }
        return;
      }

      const myList = myLists.find(l => l.myListId === myListId);
      if (!myList) {
        throw new Error(`My list with ID ${myListId} not found.`);
      }
      const type = myList.resourceType;

      while (true) {
        spinner.update(`Fetching page ${page}...`);
        const res = await fetch(
          `${endPoints[type]}/list/${myListId}?page=${page}&limit=${limit}`
        );
        const json = (await res.json()) as any;
        const items = json.items;
        if (!Array.isArray(items)) throw new Error('Invalid response');
        ids.push(...items.map((item: any) => item[idNames[type]]));
        if (items.length < limit) break;
        page++;
      }
      console.log(ids.join('\n'));
      spinner.stop('Done.');
    } catch (err) {
      spinner.stop('Error', true);
      throw err;
    }
  };
};

export default action;
