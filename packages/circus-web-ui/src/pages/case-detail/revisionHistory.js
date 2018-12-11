import React from 'react';
import wrapDisplayName from 'rb/utils/wrapDisplayName';

/**
 * Creates a redux-like store object that can handle undo/redo.
 */
export const createHistoryStore = () => {
  let history = [];
  let currentIndex = 0;
  let callbacks = [];

  const handleUpdate = () => {
    callbacks.forEach(cb => cb());
  };

  const registerNew = revision => {
    history = [revision];
    handleUpdate();
  };

  const undo = () => {
    if (currentIndex > 0) {
      currentIndex--;
      handleUpdate();
    }
  };

  const push = revision => {
    history = history.slice(0, currentIndex + 1);
    history.push(revision);
  };

  const redo = () => {
    if (currentIndex < history.length - 1) {
      currentIndex++;
      handleUpdate();
    }
  };

  const current = () => {
    return history[currentIndex];
  };

  const unsubscribe = cb => {
    callbacks = callbacks.filter(c => c !== cb);
  };

  const subscribe = cb => {
    callbacks = callbacks.filter(c => c !== cb);
    callbacks.unshift(cb);
  };

  return { registerNew, undo, redo, push, current, subscribe, unsubscribe };
};

export const connectHistoryStore = historyStore => {
  return Base => {
    const Enhanced = class extends React.PureComponent {
      componentDidMount() {
        historyStore.subscribe(this.handleUpdate);
        this.setState({ revision: historyStore.current() });
      }

      componentWillUnmount() {
        historyStore.unsubscribe(this.handleUpdate);
      }

      handleUpdate = () => {
        this.setState({ revision: historyStore.current() });
      };

      render() {
        const { revision } = this.state;
        const provideProps = {
          revision,
          historyRegisterNew: historyStore.registerNew,
          historyPush: historyStore.push,
          historyUndo: historyStore.undo,
          historyRedo: historyStore.redo
        };
        return <Base {...this.props} {...provideProps} />;
      }
    };
    Enhanced.displayName = wrapDisplayName(
      'connectHistoryStore',
      Base.displayName
    );
    return Enhanced;
  };
};
