import React, { Fragment } from 'react';
import ProjectSelector from 'components/ProjectSelector';
import { connect } from 'react-redux';
import IconButton from 'rb/IconButton';
import MultiTagSelect from 'components/MultiTagSelect';
import { Panel } from 'components/react-bootstrap';
import DataGrid from 'components/DataGrid';
import { api } from 'utils/api';
import { browserHistory } from 'react-router';
import { alert, prompt } from 'rb/modal';
import MultiRange from 'multi-integer-range';
import classnames from 'classnames';

class CreateNewCaseView extends React.Component {
  constructor(props) {
    super(props);
    const writableProjects = this.writableProjects(props);
    if (writableProjects.length) {
      this.state = {
        selectedProject: writableProjects[0].projectId,
        selectedSeries: [],
        selectedTags: []
      };
    }
  }

  ImagesRenderer = props => {
    const { value } = props;

    // uploaded images
    const imageRange = new MultiRange(value.images);

    const handleEditClick = async () => {
      const ans = await prompt(
        <span>
          Specify a <strong>continuous</strong> image range within{' '}
          <b>{value.images}</b>.
        </span>,
        value.range
      );
      if (!ans) return;
      try {
        new MultiRange(ans);
      } catch (e) {
        await alert('Syntax error.');
        return;
      }
      const mr = new MultiRange(ans);
      if (mr.segmentLength() !== 1) {
        await alert('Please specify a continuous range.');
        return;
      }
      if (!imageRange.has(mr)) {
        await alert(
          'Specified range is not included in the original image range.'
        );
        return;
      }
      const selectedSeries = [...this.state.selectedSeries];
      selectedSeries[value.volumeId] = {
        ...selectedSeries[value.volumeId],
        range: mr.toString()
      };
      this.setState({ selectedSeries });
    };

    const classes = classnames({
      'text-danger': !imageRange.equals(value.range)
    });

    return (
      <Fragment>
        <span className={classes}>{value.range}</span>{' '}
        <IconButton
          onClick={handleEditClick}
          bsStyle="default"
          bsSize="xs"
          icon="edit"
        />
      </Fragment>
    );
  };

  async componentDidMount() {
    const series = await api('series/' + this.props.params.uid);
    this.setState({
      selectedSeries: [{ ...series, range: series.images }]
    });
  }

  writableProjects(props) {
    return props.user.accessibleProjects.filter(
      p => p.roles.indexOf('write') >= 0
    );
  }

  handleProjectSelect = projectId => {
    const { user } = this.props;
    const prj = user.accessibleProjects.find(p => p.projectId === projectId);
    const newTags = this.state.selectedTags.filter(t =>
      prj.project.tags.find(tt => tt.name === t)
    );
    this.setState({
      selectedProject: projectId,
      selectedTags: newTags
    });
  };

  handleTagChange = value => {
    this.setState({ selectedTags: value });
  };

  handleCreate = async () => {
    // TODO: Check if a similar case exists

    const res = await api('cases', {
      method: 'post',
      data: {
        projectId: this.state.selectedProject,
        series: this.state.selectedSeries.map(s => ({
          seriesUid: s.seriesUid,
          range: s.range
        })),
        tags: this.state.selectedTags
      }
    });
    if (res.caseId) {
      browserHistory.push(`/case/${res.caseId}`);
    }
  };

  render() {
    // const { user } = this.props;
    const writableProjects = this.writableProjects(this.props);

    if (!writableProjects.length) {
      return (
        <div className="alert alert-danger">
          You do not belong to any writable project.
        </div>
      );
    }

    const prj = writableProjects.find(
      p => p.projectId === this.state.selectedProject
    );
    const tags = prj.project.tags;
    const columns = [
      { key: 'volumeId', caption: '#' },
      { key: 'modality', caption: 'Modality' },
      { key: 'seriesUid', caption: 'Series' },
      { key: 'seriesDescription', caption: 'Series desc' },
      { key: 'images', caption: 'Range', renderer: this.ImagesRenderer }
    ];
    const seriesData = this.state.selectedSeries.map((s, i) => ({
      volumeId: i,
      ...s
    }));

    return (
      <div>
        <h1>
          <span className="circus-icon-case" />New Case
        </h1>
        <Panel collapsible defaultExpanded header="Series">
          <DataGrid columns={columns} value={seriesData} />
          <IconButton icon="plus" bsSize="sm">
            Add Another Series
          </IconButton>
        </Panel>
        <div>
          Project:&ensp;
          <ProjectSelector
            projects={writableProjects}
            value={this.state.selectedProject}
            onChange={this.handleProjectSelect}
          />
          &ensp; Tags:&ensp;
          <MultiTagSelect
            tags={tags}
            value={this.state.selectedTags}
            onChange={this.handleTagChange}
          />
          &ensp;
          <IconButton icon="star" bsStyle="primary" onClick={this.handleCreate}>
            Create
          </IconButton>
        </div>
      </div>
    );
  }
}

const CreateNewCase = connect(state => {
  return { user: state.loginUser.data };
})(CreateNewCaseView);

export default CreateNewCase;
