import './ReservationsPage.css';

export default function ReservationsPage() {
  return (
    <div className="reservations-page">
      <div className="page-header">
        <h1 className="page-title">Reservations</h1>
        <button className="primary-button">새 예약 추가</button>
      </div>

      {/* Reservation Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>상태</label>
          <select className="filter-select">
            <option value="all">전체</option>
            <option value="confirmed">확정</option>
            <option value="cancelled">취소</option>
            <option value="needs-correction">검토 필요</option>
          </select>
        </div>
        <div className="filter-group">
          <label>날짜</label>
          <input type="date" className="filter-input" />
        </div>
      </div>

      {/* Correction Queue Alert */}
      <div className="alert-banner warning">
        <span className="alert-icon">⚠️</span>
        <span>검토가 필요한 예약이 0건 있습니다</span>
      </div>

      {/* Reservations Table */}
      <div className="table-container">
        <table className="reservations-table">
          <thead>
            <tr>
              <th>날짜</th>
              <th>시간</th>
              <th>예약자명</th>
              <th>인원</th>
              <th>요금</th>
              <th>상태</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            <tr className="empty-row">
              <td colSpan={7}>
                <div className="empty-state">
                  <p>예약 내역이 없습니다</p>
                  <button className="secondary-button">첫 예약 추가하기</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
