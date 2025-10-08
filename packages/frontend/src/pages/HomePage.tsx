import { useNavigate } from 'react-router-dom';
import './HomePage.css';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <div className="hero-section">
        <h1>Welcome to Studio Morph</h1>
        <p className="hero-subtitle">매출·수익 관리 시스템</p>
        <p className="hero-description">
          스튜디오 예약부터 매출 분석까지, 하나의 플랫폼에서 관리하세요
        </p>
        <div className="hero-actions">
          <button
            className="primary-button"
            onClick={() => navigate('/dashboard')}
          >
            Dashboard 시작하기
          </button>
          <button
            className="secondary-button"
            onClick={() => navigate('/reservations')}
          >
            예약 관리
          </button>
        </div>
      </div>

      <div className="features-section">
        <h2>주요 기능</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Dashboard</h3>
            <p>실시간 매출, 비용, 순이익을 한눈에 확인</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📅</div>
            <h3>Reservations</h3>
            <p>예약 관리 및 자동 요금 계산</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💰</div>
            <h3>Sales</h3>
            <p>은행 거래내역 매칭 및 매출 분석</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📉</div>
            <h3>Costs</h3>
            <p>고정비·변동비 관리 및 추적</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📈</div>
            <h3>Reports</h3>
            <p>월간 요약 및 트렌드 분석</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚙️</div>
            <h3>Settings</h3>
            <p>목표 설정 및 알림 관리</p>
          </div>
        </div>
      </div>
    </div>
  );
}
