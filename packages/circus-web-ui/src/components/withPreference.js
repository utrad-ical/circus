import React from 'react';

/**
 * A HoC that provides a preference value stored in localStorage
 * along with its accessor.
 * @param {string} prefName The key with which the preference is saved.
 * @param {any} defaultValue Any JSON-serializable data.
 */
const withPreference = (prefName, defaultValue) => {
  return BaseComponent => {
    const Enhanced = class extends React.PureComponent {
      constructor(props) {
        super(props);
        this.state = { busy: true };
      }

      componentDidMount() {
        const savedValue = localStorage.getItem(prefName);
        this.setState({
          busy: false,
          value: savedValue !== null ? JSON.parse(savedValue) : defaultValue
        });
      }

      handleChange = async newValue => {
        this.setState({ busy: true, value: newValue });
        localStorage.setItem(prefName, JSON.stringify(newValue));
        this.setState({ busy: false });
      };

      render() {
        const obj = {
          [prefName]: this.state.value,
          [`${prefName}Busy`]: this.state.busy,
          [`${prefName}Change`]: this.handleChange
        };
        return <BaseComponent {...this.props} {...obj} />;
      }
    };
    Enhanced.displayName = `withPreference(${BaseComponent.displayName})`;
    return Enhanced;
  };
};

export default withPreference;
