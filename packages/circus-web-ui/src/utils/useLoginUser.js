import { useMappedState } from 'redux-react-hook';

const mapState = state => state.loginUser.data;

/**
 * A React cutsom hook to fetch login user from redux store.
 */
const useLoginUser = () => useMappedState(mapState);

export default useLoginUser;
