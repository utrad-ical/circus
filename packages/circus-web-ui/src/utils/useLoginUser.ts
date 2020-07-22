import { useSelector } from 'react-redux';

/**
 * A React cutsom hook to fetch login user from redux store.
 * This assumes you are using this hook after a successful login.
 */
const useLoginUser = () => useSelector(state => state.loginUser.data!);

export default useLoginUser;
