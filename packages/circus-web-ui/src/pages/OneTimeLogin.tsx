import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
import React, { FC, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLoginManager } from 'utils/loginManager';
import useLoginUser from 'utils/useLoginUser';
import useQuery from 'utils/useQuery';

/**
 * A temporary screen that tries to authenticate a onetime password.
 */
const OneTimeLogin: FC = () => {
  const query = useQuery();
  const pwd = query.get('pwd');
  const redirect = query.get('redirect');

  const loginManager = useLoginManager();
  const [error, setError] = useState<string>();
  const [loginSucceeded, setLoginSucceeded] = useState(false);
  const user = useLoginUser();
  const navigate = useNavigate();

  // Force logout when user shows this page
  useEffect(() => {
    if (user && !loginSucceeded) {
      const logout = async () => {
        await loginManager.logout();
      };
      logout();
    }
  }, [loginManager, loginSucceeded, user]);

  useEffect(() => {
    (async () => {
      if (!pwd) {
        setError(
          'This login URL is invalid. Check you have copied it correctly.'
        );
        return;
      }
      try {
        await loginManager.tryAuthenticate(pwd, pwd);
        setLoginSucceeded(true);
      } catch (err: any) {
        if (err.response && err.response.status === 400) {
          setError('This onetime URL is invalid or has been expired.');
        } else {
          setError(
            'Unknown error. The CIRCUS API server may not be running. ' +
              'Please consult the administrator.'
          );
        }
      }
      await loginManager.refreshUserInfo(true);
      navigate(redirect || '/home');
    })();
  }, [loginManager, pwd, redirect, navigate]);

  return (
    <div className="container">
      {error ? (
        <>
          <h1>Error</h1>
          <div className="alert alert-danger">
            <p>{error}</p>
            <div>
              <Link to="/" className="btn btn-default">
                Manual Login
              </Link>
            </div>
          </div>
        </>
      ) : (
        <LoadingIndicator delay={500} />
      )}
    </div>
  );
};

export default OneTimeLogin;
