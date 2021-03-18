import { useContext, useEffect, useState } from 'react';
import CsResultsContext from './CsResultsContext';

interface AttachmentTypeMap {
  json: any;
  text: string;
  arrayBuffer: ArrayBuffer;
}

/**
 * Declaratively retrieve a file from the CAD output.
 * @param path The path of the requested file name.
 * @param type The desired file type.
 * One of `'text'`, `'json'` (parsed) and `'arrayBuffer'`.
 * @returns The loaded data if successful,
 * `undefined` if the data is still loading, an `Error` is an error happened.
 */
export const usePluginAttachment = <T extends keyof AttachmentTypeMap>(
  path: string,
  type: keyof AttachmentTypeMap = 'text'
): AttachmentTypeMap[T] | Error | undefined => {
  const [data, setData] = useState<any>(undefined);
  const { loadAttachment } = useContext(CsResultsContext);

  useEffect(() => {
    let loading = false;
    let abortController: AbortController;
    const load = async () => {
      loading = true;
      abortController = new AbortController();
      const res = await loadAttachment(path, abortController);
      if (type === 'text') setData(await res.text());
      else if (type === 'json') setData(await res.json());
      else setData(await res.arrayBuffer());
    };
    load();
    return () => {
      if (loading) abortController.abort();
    };
  }, [path]);

  return data;
};
