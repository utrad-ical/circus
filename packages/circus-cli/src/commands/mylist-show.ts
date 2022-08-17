import easyTable from 'easy-table';
import { fetchWithSpinner } from '../utils/createAuthorizedFetch.js';
import CommandAction from './CommandAction.js';

const resourceTypes = ['series', 'clinicalCases', 'pluginJobs'];
type ResourceType = typeof resourceTypes[number];

interface MyList {
  myListId: string;
  resourceType: ResourceType;
  name: string;
  createdAt: string;
}

const action: CommandAction = ({ getFetch }) => {
  return async () => {
    const fetch = getFetch();

    const res = await fetchWithSpinner(
      fetch,
      "Fetching user's my lists",
      'mylists'
    );

    const myLists = (await res.json()) as MyList[];
    const dispList = myLists
      .sort((a, b) => a.resourceType.localeCompare(b.resourceType))
      .map(l => ({
        'resource type': l.resourceType,
        'list ID': l.myListId,
        name: l.name,
        created: l.createdAt
      }));

    if (dispList.length === 0) {
      console.log('This user has no my list yet.');
    } else {
      console.log(easyTable.print(dispList));
    }
    return;
  };
};

export default action;
