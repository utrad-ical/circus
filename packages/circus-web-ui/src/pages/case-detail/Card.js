import React from 'react';
import classnames from 'classnames';
import { Glyphicon } from 'components/react-bootstrap';

export default class Card extends React.Component {
  constructor(props) {
    super(props);
    this.state = { open: true };
    this.toggleCollapse = this.toggleCollapse.bind(this);
  }

  toggleCollapse() {
    this.setState({ open: !this.state.open });
  }

  render() {
    const { title, children, className } = this.props;
    const { open } = this.state;
    return (
      <div className={classnames('case-detail-card', className)}>
        <a className="case-detail-card-header" onClick={this.toggleCollapse}>
          {title}
          &ensp;
          {open ? (
            <Glyphicon glyph="triangle-bottom" />
          ) : (
            <Glyphicon glyph="triangle-right" />
          )}
        </a>
        {open && <div className="case-detail-card-body">{children}</div>}
      </div>
    );
  }
}
