import { Link } from 'react-router-dom';
import './Header.css';

export default function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="header-logo">
          <h1>Studio Morph</h1>
        </Link>
        <nav className="header-nav">
          <div className="user-info">
            <span className="user-name">관리자</span>
          </div>
        </nav>
      </div>
    </header>
  );
}
