const evtSrc = new EventSource('/events');

const load = async () => {
  const metadata = await fetch('/metadata').then(res => res.json());
  const volume = await fetch('/volume').then(res => res.arrayBuffer());
};

load();
