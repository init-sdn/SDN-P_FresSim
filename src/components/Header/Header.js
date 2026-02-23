import Image from 'next/image';

const Header = () => {
  return (
    <nav className="navbar sticky-top navbar-expand-lg navbar-dark bg-primary">
      <div className="container-fluid">
        <Image src="/fressim/static/images/logo.png" width={250} height={75} alt='logo' />
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#collapsibleNavbar">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="collapsibleNavbar">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <a className="nav-link active disabled" aria-current="page">Home</a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Header;
