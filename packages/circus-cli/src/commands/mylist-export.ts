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
  createdAt: string;
}

const limit = 100; // fetches per page

const action: CommandAction = ({ getFetch }) => {
  return async (myListId: string, options: { type: ResourceType }) => {
    const fetch = getFetch();
    const ids: string[] = [];
    const spinner = createSpinner("Fetching user's my lists...");
    let page = 1;

    try {
      const myLists = (await (await fetch(`mylists`)).json()) as MyList[];

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
      spinner.stop(`Done. ${ids.length} items found.`);
      process.stdout.write(ids.join('\n') + '\n');
    } catch (err) {
      spinner.stop('Error', true);
      throw err;
    }
  };
};

export default action;
