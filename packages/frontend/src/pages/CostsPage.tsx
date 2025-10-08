import './CostsPage.css';

export default function CostsPage() {
  return (
    <div className="costs-page">
      <div className="page-header">
        <h1 className="page-title">Costs</h1>
      </div>

      {/* Cost Input Form */}
      <div className="cost-form-section">
        <h2>월별 비용 입력</h2>
        <div className="cost-form-card">
          <div className="form-section">
            <h3>고정비</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>임대료</label>
                <input
                  type="number"
                  placeholder="0"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>전기/수도세</label>
                <input
                  type="number"
                  placeholder="0"
                  className="form-input"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>변동비</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>광고비 (월 총액)</label>
                <input
                  type="number"
                  placeholder="0"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>소모품</label>
                <input
                  type="number"
                  placeholder="0"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>장비 유지보수</label>
                <input
                  type="number"
                  placeholder="0"
                  className="form-input"
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button className="secondary-button">취소</button>
            <button className="primary-button">저장</button>
          </div>
        </div>
      </div>

      {/* Recent 3 Months Average */}
      <div className="average-section">
        <h2>최근 3개월 평균</h2>
        <div className="average-grid">
          <div className="average-card">
            <div className="average-label">고정비 평균</div>
            <div className="average-value">₩0</div>
          </div>
          <div className="average-card">
            <div className="average-label">변동비 평균</div>
            <div className="average-value">₩0</div>
          </div>
          <div className="average-card">
            <div className="average-label">총 비용 평균</div>
            <div className="average-value">₩0</div>
          </div>
        </div>
      </div>
    </div>
  );
}
