import setting from './setting';

document.addEventListener('DOMContentLoaded', function (e) {
    const entries = document.querySelector('#entries') as HTMLDivElement;
    for (let i = 0; i < setting.count(); i++) {
        const el = document.createElement('div');
        const s = setting.get(i);
        el.classList.add('list-group-item')
        el.innerText = s.server + "\n" + s.seriesUid + (s.partialVolumeDescriptor ? "\n" + s.partialVolumeDescriptor : '');

        const removeBtn = document.createElement('button');
        removeBtn.classList.add('close', 'text-danger');
        removeBtn.innerHTML = '&times';
        removeBtn.addEventListener('click', () => {
            setting.remove(i);
            window.location.reload();
        });

        el.append(removeBtn);

        entries.append(el);
    }

    const addButton = document.querySelector('#add-button') as HTMLButtonElement;
    addButton.addEventListener('click', () => {
        const val = (name: string) => (document.querySelector('[name=' + name + ']') as HTMLInputElement).value;
        const server = val('server');
        const seriesUid = val('seriesUid');
        const partialVolumeDescriptor = val('partialVolumeDescriptor');
        setting.add(server, seriesUid, partialVolumeDescriptor);

        window.location.reload();
    });
});
