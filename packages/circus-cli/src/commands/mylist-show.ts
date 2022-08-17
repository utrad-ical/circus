import { fetchWithSpinner } from '../utils/createAuthorizedFetch.js';
import CommandAction from './CommandAction.js';

const resourceTypes = ['series', 'clinicalCases', 'pluginJobs'];
type ResourceType = typeof resourceTypes[number];

interface MyList {
  myListId: string;
  resourceType: ResourceType;
  name: string;
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
      .map(l => ({
        myListId: l.myListId,
        resourceType: l.resourceType,
        name: l.name
      }))
      .sort((a, b) => a.resourceType.localeCompare(b.resourceType));

    if (dispList.length === 0) {
      console.log('This user has no my list yet.');
    } else {
      console.table(dispList);
    }
    return;
  };
};

export default action;
