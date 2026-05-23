import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useTranslation } from 'react-i18next'
import { X, Download, Printer, FileText } from 'lucide-react'
import { formatEthiopianDate } from '../utils/ethiopianCalendar'

interface Receipt {
  _id: string
  receiptId: string
  memberId: string
  memberName: string
  amount: number
  currency: string
  period: { month: number; year: number }
  paymentMethod: string
  issuedBy: string
  issuedAt: string
  branch: string
  status: string
  member?: {
    fullName: string
    memberId: string
    branch: string
    membershipType: string
    subType: string
    contribution: {
      monthlyFee: number
      annualFee: number
      percentage: number
    }
  }
  payment?: {
    method: string
    frequency: string
    paymentDate: string
    notes: string
  }
}

interface ReceiptModalProps {
  receiptId: string
  onClose: () => void
}

export default function ReceiptModal({ receiptId, onClose }: ReceiptModalProps) {
  const { t } = useTranslation()
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReceipt()
  }, [receiptId])

  const fetchReceipt = async () => {
    try {
      const res = await api.get(`/receipts/${receiptId}`)
      setReceipt(res.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      const response = await api.get(`/receipts/${receiptId}/download`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${receipt?.receiptId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download PDF:', err)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl p-8">
          <p className="text-center">{t('common.loading_receipt')}</p>
        </div>
      </div>
    )
  }

  if (!receipt) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl p-8">
          <p className="text-center text-red-500">{t('common.receipt_fail')}</p>
          <button onClick={onClose} className="btn btn-secondary mt-4">{t('common.close')}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between print:hidden">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            {t('common.receipt_id')}: {receipt.receiptId}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              {t('common.print')}
            </button>
            <button
              onClick={handleDownloadPDF}
              className="btn btn-primary flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {t('common.download_pdf')}
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div className="p-6 space-y-6">
          {/* Organization Header */}
          <div className="text-center border-b-2 border-primary-600 pb-4">
            <h1 className="text-2xl font-bold text-primary-600">{t('common.diredawa_city_admin')}</h1>
            <p className="text-lg font-semibold">Finance Bureau</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.app_subtitle')}</p>
            <h2 className="text-xl font-bold mt-4">{t('common.official_receipt')}</h2>
          </div>

          {/* Receipt Info */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.receipt_id')}</p>
              <p className="font-bold font-mono">{receipt.receiptId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.date_issued')}</p>
              <p className="font-bold">
                {formatEthiopianDate(receipt.issuedAt)}
              </p>
            </div>
          </div>

          {/* Member Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
              {t('common.member_information')}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.full_name')}</p>
                <p className="font-semibold">{receipt.member?.fullName || receipt.memberName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.member_id')}</p>
                <p className="font-semibold font-mono">{receipt.member?.memberId || receipt.memberId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.sector_unit')}</p>
                <p className="font-semibold">{receipt.member?.branch || receipt.branch}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.membership_type')}</p>
                <p className="font-semibold">
                  {receipt.member?.membershipType || 'N/A'}
                  {receipt.member?.subType && ` - ${receipt.member.subType}`}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
              {t('common.payment_information')}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.amount_paid')}</p>
                <p className="text-2xl font-bold text-green-600">
                  {receipt.currency} {receipt.amount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.payment_method')}</p>
                <p className="font-semibold">{receipt.payment?.method || receipt.paymentMethod}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.frequency')}</p>
                <p className="font-semibold">{receipt.payment?.frequency || 'Monthly'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.payment_period')}</p>
                <p className="font-semibold">
                  {t(`common.eth_month_${receipt.period.month}`)} / {receipt.period.year}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.received_by')}</p>
                <p className="font-semibold">{receipt.issuedBy}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.status')}</p>
                <span className="badge badge-success">{receipt.status}</span>
              </div>
            </div>
          </div>

          {/* Contribution Details */}
          {receipt.member?.contribution && (
            <div>
              <h3 className="text-lg font-semibold mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
                {t('common.contribution_details')}
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.monthly_fee')}</p>
                  <p className="font-semibold">{receipt.currency} {receipt.member.contribution.monthlyFee.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.annual_fee')}</p>
                  <p className="font-semibold">{receipt.currency} {receipt.member.contribution.annualFee.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.percentage')}</p>
                  <p className="font-semibold">{receipt.member.contribution.percentage}%</p>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {receipt.payment?.notes && (
            <div>
              <h3 className="text-lg font-semibold mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
                {t('common.notes')}
              </h3>
              <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                {receipt.payment.notes}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-4 mt-6">
            <p className="text-center text-sm text-gray-600 dark:text-gray-400 italic">
              {t('common.official_receipt_footer')}
            </p>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              {t('common.keep_receipt')}
            </p>
            <p className="text-center text-xs text-gray-500 dark:text-gray-500 mt-2">
              Generated on: {formatEthiopianDate(new Date())}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

