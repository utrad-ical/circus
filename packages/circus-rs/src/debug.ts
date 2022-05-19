let logNo = 0;
export const console_log = (content: string) => console.log(`${(++logNo).toString()}. ${content}`);
