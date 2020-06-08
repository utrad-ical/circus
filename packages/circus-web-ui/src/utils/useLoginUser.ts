import { useSelector } from 'react-redux';

/**
 * A React cutsom hook to fetch login user from redux store.
 */
const useLoginUser = () => useSelector(state => state.loginUser.data);

export default useLoginUser;
