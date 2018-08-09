import React from 'react';
import classnames from 'classnames';
import { Glyphicon } from 'shared/components/react-bootstrap';

export default class Collapser extends React.Component {
  constructor(props) {
    super(props);
    this.state = { open: !!props.defaultOpen };
  }

  toggleCollapse = () => {
    this.setState({ open: !this.state.open });
  };

  render() {
    const { title, children, className, framed, noPadding } = this.props;
    const { open } = this.state;
    return (
      <div
        className={classnames(
          'collapser',
          { framed, noPadding, open },
          className
        )}
      >
        <a className="collapser-header" onClick={this.toggleCollapse}>
          {title}
          &ensp;
          <Glyphicon className="triangle" glyph="triangle-right" />
        </a>
        {open && <div className="collapser-body">{children}</div>}
      </div>
    );
  }
}

Collapser.defaultProps = { defaultOpen: true };
