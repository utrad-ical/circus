import React, { useEffect, useState } from 'react';
import { useApi } from 'utils/api';
import fetchEventSource, { Event } from 'utils/fetchEventSource';

const TaskNotifier: React.FC<{}> = props => {
  const [data, setData] = useState<Event[]>([]);
  const api = useApi();
  const token = api.getToken();

  useEffect(() => {
    const abortController = new AbortController();
    const load = async () => {
      const generator = fetchEventSource('/api/tasks/report', {
        headers: { Authorization: `Bearer ${token}` },
        signal: abortController.signal
      });
      for await (const event of generator) {
        setData(data => [...data, event]);
      }
    };
    load();
    return () => {
      abortController.abort();
    };
  }, [token]);

  return <div>{JSON.stringify(data)}</div>;
};

export default TaskNotifier;
