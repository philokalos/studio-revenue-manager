import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import DownloadIcon from '@mui/icons-material/Download';

interface ReportData {
  date: string;
  studio: string;
  revenue: number;
  rentalCount: number;
  avgRentalRate: number;
}

const ReportsPage: React.FC = () => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [reportType, setReportType] = useState<string>('revenue');
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      setError('시작일과 종료일을 선택해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          reportType,
        }),
      });

      if (!response.ok) {
        throw new Error('보고서 생성 실패');
      }

      const data = await response.json();
      setReportData(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '보고서 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    if (reportData.length === 0) {
      setError('내보낼 보고서 데이터가 없습니다.');
      return;
    }

    try {
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: reportData,
          format: 'xlsx',
          reportType,
        }),
      });

      if (!response.ok) {
        throw new Error('보고서 내보내기 실패');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${reportType}_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : '보고서 내보내기 중 오류가 발생했습니다.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  const getTotalRevenue = () => {
    return reportData.reduce((sum, row) => sum + row.revenue, 0);
  };

  const getTotalRentals = () => {
    return reportData.reduce((sum, row) => sum + row.rentalCount, 0);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          보고서
        </Typography>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>보고서 유형</InputLabel>
                <Select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  label="보고서 유형"
                >
                  <MenuItem value="revenue">매출 보고서</MenuItem>
                  <MenuItem value="rental">대여 보고서</MenuItem>
                  <MenuItem value="studio">스튜디오별 보고서</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <DatePicker
                label="시작일"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                  },
                }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <DatePicker
                label="종료일"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                  },
                }}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <Button
                variant="contained"
                fullWidth
                onClick={handleGenerateReport}
                disabled={loading}
                sx={{ height: '56px' }}
              >
                {loading ? '생성 중...' : '생성'}
              </Button>
            </Grid>
          </Grid>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Paper>

        {reportData.length > 0 && (
          <>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">보고서 결과</Typography>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleExportReport}
                >
                  Excel 다운로드
                </Button>
              </Box>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, bgcolor: 'primary.light' }}>
                    <Typography variant="body2" color="text.secondary">
                      총 매출
                    </Typography>
                    <Typography variant="h5">
                      {formatCurrency(getTotalRevenue())}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, bgcolor: 'secondary.light' }}>
                    <Typography variant="body2" color="text.secondary">
                      총 대여 건수
                    </Typography>
                    <Typography variant="h5">
                      {getTotalRentals()}건
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, bgcolor: 'success.light' }}>
                    <Typography variant="body2" color="text.secondary">
                      평균 대여료
                    </Typography>
                    <Typography variant="h5">
                      {formatCurrency(getTotalRevenue() / getTotalRentals() || 0)}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>날짜</TableCell>
                      <TableCell>스튜디오</TableCell>
                      <TableCell align="right">매출</TableCell>
                      <TableCell align="right">대여 건수</TableCell>
                      <TableCell align="right">평균 대여료</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{new Date(row.date).toLocaleDateString('ko-KR')}</TableCell>
                        <TableCell>{row.studio}</TableCell>
                        <TableCell align="right">{formatCurrency(row.revenue)}</TableCell>
                        <TableCell align="right">{row.rentalCount}건</TableCell>
                        <TableCell align="right">{formatCurrency(row.avgRentalRate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        )}
      </Container>
    </LocalizationProvider>
  );
};

export default ReportsPage;
