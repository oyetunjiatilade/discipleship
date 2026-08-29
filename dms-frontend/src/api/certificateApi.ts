import apiClient from './client';

async function downloadBlob(url: string, fallbackName: string): Promise<void> {
  const response = await apiClient.get(url, { responseType: 'blob' });
  const disposition = response.headers['content-disposition'] || '';
  const match = disposition.match(/filename="?(.+?)"?$/);
  const filename = match?.[1] || fallbackName;
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}

export const certificateApi = {
  /** GET /v1/certificate — own completion certificate */
  downloadOwn: (): Promise<void> => downloadBlob('/v1/certificate', 'certificate.pdf'),

  /** GET /v1/admin/converts/:id/certificate */
  downloadForConvert: (convertId: string): Promise<void> =>
    downloadBlob(`/v1/admin/converts/${convertId}/certificate`, 'certificate.pdf'),
};
