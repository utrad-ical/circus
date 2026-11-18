import { myListDoc } from './myList.ts';

/** A my list returned by the API, without the owner and the items */
export const userMyList = myListDoc
  .pick({
    myListId: true,
    resourceType: true,
    name: true,
    public: true,
    editors: true,
    createdAt: true
  })
  .describe('Represents a my list of a user.');
