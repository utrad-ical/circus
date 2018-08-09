import React from 'react';
import ShrinkSelect from 'rb/ShrinkSelect';
import TimeDisplay from '../../components/TimeDisplay';

export default class RevisionSelector extends React.PureComponent {
  renderItem(revision) {
    return (
      <span className="revision-selector-item">
        <span className="date">
          <TimeDisplay value={revision.date} />
        </span>
        <span className="status label label-default">{revision.status}</span>
        <span className="description">{revision.description}</span>
        <span className="creator">{revision.creator}</span>
      </span>
    );
  }

  selected = value => {
    const { onSelect } = this.props;
    const index = parseInt(/(\d+)$/.exec(value)[1]);
    onSelect(index);
  };

  render() {
    const { revisions = [], selected } = this.props;
    const opts = {};
    revisions
      .slice()
      .reverse()
      .forEach((r, i) => {
        const originalIndex = revisions.length - i - 1;
        opts[`rev${originalIndex}`] = { caption: this.renderItem(r) };
      });
    const sel = `rev${selected}`;
    return <ShrinkSelect options={opts} value={sel} onChange={this.selected} />;
  }
}
