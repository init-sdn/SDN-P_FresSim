import Head from 'next/head';

import Header from '@components/Header';
import Footer from '@components/Footer';

import styles from './Layout.module.scss';
import "bootstrap/dist/css/bootstrap.min.css"

const Layout = ({ children, className, ...rest }) => {
  return (
    <div className={styles.layout}>
      <Header />
      <main className={styles.main}>{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;
