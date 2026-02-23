import Container from '@components/Container';

import styles from './Footer.module.scss';

const Footer = ({ ...rest }) => {
  return (
    <footer className={styles.footer} {...rest}>
      <Container className={`${styles.footerContainer} ${styles.footerLegal}`}>
        <p>
          &copy; <a href="http://init.unizar.es">iNiT-SDN</a>, {new Date().getFullYear()}
          {' '}- <a href="https://github.com/init-sdn/SDN-P_FresSim">Source Code</a>
        </p>
      </Container>
    </footer>
  );
};

export default Footer;
