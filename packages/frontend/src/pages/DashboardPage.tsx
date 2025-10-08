import './DashboardPage.css';

export default function DashboardPage() {
  return (
    <div className="dashboard-page">
      <h1 className="page-title">Dashboard</h1>

      {/* KPI Cards - Bento-style Layout */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">오늘 매출</div>
          <div className="kpi-value">₩0</div>
          <div className="kpi-change positive">+0%</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">이번달 매출</div>
          <div className="kpi-value">₩0</div>
          <div className="kpi-change positive">+0%</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">이번달 비용</div>
          <div className="kpi-value">₩0</div>
          <div className="kpi-change negative">-0%</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">이번달 순이익</div>
          <div className="kpi-value">₩0</div>
          <div className="kpi-change positive">+0%</div>
        </div>
        <div className="kpi-card wide">
          <div className="kpi-label">예약률</div>
          <div className="kpi-value">0%</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: '0%' }}></div>
          </div>
        </div>
      </div>

      {/* Monthly Goal Gauge */}
      <div className="goal-section">
        <h2>월 목표 달성률</h2>
        <div className="goal-gauge">
          <div className="gauge-container">
            <div className="gauge-fill" style={{ width: '0%' }}></div>
          </div>
          <div className="goal-info">
            <span>목표: ₩0</span>
            <span>현재: ₩0</span>
            <span>달성률: 0%</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="activity-section">
        <h2>최근 활동</h2>
        <div className="activity-grid">
          <div className="activity-card">
            <h3>최근 예약</h3>
            <p className="empty-state">예약 내역이 없습니다</p>
          </div>
          <div className="activity-card">
            <h3>최근 매출</h3>
            <p className="empty-state">매출 내역이 없습니다</p>
          </div>
        </div>
      </div>
    </div>
  );
}
