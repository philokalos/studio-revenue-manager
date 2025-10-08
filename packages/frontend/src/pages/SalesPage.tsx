import './SalesPage.css';

export default function SalesPage() {
  return (
    <div className="sales-page">
      <div className="page-header">
        <h1 className="page-title">Sales</h1>
        <button className="primary-button">은행 거래내역 업로드</button>
      </div>

      {/* Upload Section */}
      <div className="upload-section">
        <div className="upload-card">
          <div className="upload-icon">📁</div>
          <h3>은행 거래내역 업로드</h3>
          <p>CSV 파일을 업로드하여 자동으로 매출을 매칭하세요</p>
          <button className="secondary-button">파일 선택</button>
        </div>
      </div>

      {/* Matching Queue */}
      <div className="matching-section">
        <h2>매칭 대기 중</h2>
        <div className="matching-card">
          <p className="empty-state">매칭 대기 중인 거래내역이 없습니다</p>
        </div>
      </div>

      {/* Sales List */}
      <div className="sales-list-section">
        <h2>매출 내역</h2>
        <div className="table-container">
          <table className="sales-table">
            <thead>
              <tr>
                <th>날짜</th>
                <th>금액</th>
                <th>예약 연결</th>
                <th>상태</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              <tr className="empty-row">
                <td colSpan={5}>
                  <div className="empty-state">
                    <p>매출 내역이 없습니다</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
