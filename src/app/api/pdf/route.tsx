import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  renderToBuffer 
} from '@react-pdf/renderer'
import { format, parseISO } from 'date-fns'

// Define styling rules for PDF invoice sheet
const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#333333',
    lineHeight: 1.5,
  },
  header: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#10b981', // green theme border
    paddingBottom: 15,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  companyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#047857', // Emerald Primary
  },
  companySub: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  invoiceMeta: {
    textAlign: 'right',
  },
  invoiceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  refNumber: {
    fontSize: 10,
    fontFamily: 'Courier',
    marginTop: 4,
    color: '#047857',
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  col: {
    width: '47%',
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 4,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 10,
    marginBottom: 3,
    color: '#1f2937',
  },
  metaBold: {
    fontWeight: 'bold',
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 25,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 8,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 8,
  },
  colDesc: { width: '50%' },
  colUnit: { width: '15%', textAlign: 'right' },
  colQty: { width: '15%', textAlign: 'center' },
  colSum: { width: '20%', textAlign: 'right' },
  summarySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  notesArea: {
    width: '55%',
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  notesText: {
    fontSize: 8.5,
    color: '#4b5563',
    fontStyle: 'italic',
  },
  totalsArea: {
    width: '40%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    fontSize: 9,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: '#10b981',
    marginTop: 4,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#047857',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  }
})

// Currency Formatting inside PDF (en-IN gives South Asian xx,xx,xxx grouping)
const formatPKR = (val: number) => {
  return `PKR ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val)}`
}

// React Document to render inside @react-pdf/renderer
function InvoiceDocument({ booking, addons }: { booking: any, addons: any[] }) {
  const dateStr = format(parseISO(booking.event_date), 'dd MMM yyyy')
  const timeStr = `${booking.start_time.substring(0, 5)} - ${booking.end_time.substring(0, 5)}`
  const balance = Number(booking.final_amount) - Number(booking.advance_paid)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header Block */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyTitle}>Hallvo</Text>
            <Text style={styles.companySub}>Internal Wedding Hall Booking Receipt</Text>
          </View>
          <View style={styles.invoiceMeta}>
            <Text style={styles.invoiceTitle}>INVOICE RECEIPT</Text>
            <Text style={styles.refNumber}>REF: {booking.id.substring(0, 8).toUpperCase()}</Text>
          </View>
        </View>

        {/* Client & Event Metadata */}
        <View style={styles.grid}>
          {/* Client column */}
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Client Information</Text>
            <Text style={styles.metaValue}><Text style={styles.metaBold}>Name:</Text> {booking.customer_name}</Text>
            <Text style={styles.metaValue}><Text style={styles.metaBold}>Phone:</Text> {booking.customer_phone}</Text>
            {booking.customer_email && (
              <Text style={styles.metaValue}><Text style={styles.metaBold}>Email:</Text> {booking.customer_email}</Text>
            )}
          </View>
          
          {/* Event column */}
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Booking Details</Text>
            <Text style={styles.metaValue}><Text style={styles.metaBold}>Hall Name:</Text> {booking.halls?.name}</Text>
            <Text style={styles.metaValue}><Text style={styles.metaBold}>Event Date:</Text> {dateStr}</Text>
            <Text style={styles.metaValue}><Text style={styles.metaBold}>Time Slot:</Text> {timeStr}</Text>
            <Text style={styles.metaValue}><Text style={styles.metaBold}>Guests Count:</Text> {booking.guests_count}</Text>
          </View>
        </View>

        {/* Itemized pricing table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>Description</Text>
            <Text style={styles.colUnit}>Unit Price</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colSum}>Subtotal</Text>
          </View>

          {/* Base Hall Price */}
          <View style={styles.tableRow}>
            <Text style={styles.colDesc}>{booking.halls?.name} - Base Hall Rent</Text>
            <Text style={styles.colUnit}>{formatPKR(booking.base_amount)}</Text>
            <Text style={styles.colQty}>1</Text>
            <Text style={styles.colSum}>{formatPKR(booking.base_amount)}</Text>
          </View>

          {/* Selected Addons */}
          {addons.map((a) => (
            <View key={a.addon_id} style={styles.tableRow}>
              <Text style={styles.colDesc}>{a.addons?.name}</Text>
              <Text style={styles.colUnit}>{formatPKR(a.unit_price)}</Text>
              <Text style={styles.colQty}>{a.quantity}</Text>
              <Text style={styles.colSum}>{formatPKR(a.total_price)}</Text>
            </View>
          ))}
        </View>

        {/* Bottom Section: Notes & Totals */}
        <View style={styles.summarySection}>
          
          {/* Notes column */}
          <View style={styles.notesArea}>
            <Text style={styles.sectionTitle}>Invoice Conditions & Notes</Text>
            <Text style={styles.notesText}>
              {booking.notes ? booking.notes : 'No extra booking notes provided by the desk staff.'}
            </Text>
          </View>

          {/* Totals column */}
          <View style={styles.totalsArea}>
            <View style={styles.totalRow}>
              <Text>Hall Base Rate:</Text>
              <Text>{formatPKR(booking.base_amount)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>Addons Total:</Text>
              <Text>{formatPKR(booking.addon_amount)}</Text>
            </View>
            {Number(booking.discount_amount) > 0 && (
              <View style={styles.totalRow}>
                <Text style={{ color: '#dc2626' }}>Discount Applied:</Text>
                <Text style={{ color: '#dc2626' }}>-{formatPKR(booking.discount_amount)}</Text>
              </View>
            )}

            <View style={styles.grandTotalRow}>
              <Text>Grand Total:</Text>
              <Text>{formatPKR(booking.final_amount)}</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={{ color: '#059669', fontWeight: 'bold' }}>Advance Paid:</Text>
              <Text style={{ color: '#059669', fontWeight: 'bold' }}>{formatPKR(booking.advance_paid)}</Text>
            </View>
            
            <View style={styles.totalRow}>
              <Text style={{ fontWeight: 'bold' }}>Balance Due:</Text>
              <Text style={{ fontWeight: 'bold' }}>{formatPKR(Math.max(0, balance))}</Text>
            </View>
          </View>
        </View>

        {/* Invoice Terms Footer */}
        <Text style={styles.footer}>
          Thank you for choosing Hallvo. This is a computer-generated billing statement and doesn't require signatures.
        </Text>

      </Page>
    </Document>
  )
}

// Next.js GET Router endpoint
export async function GET(
  request: Request
) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response('Unauthorized session.', { status: 401 })
    }

    // 2. Parse URL parameters
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('id')
    if (!bookingId) {
      return new Response('Missing booking id parameter.', { status: 400 })
    }

    // 3. Query booking details
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('*, halls(*)')
      .eq('id', bookingId)
      .single()

    if (bookingErr || !booking) {
      return new Response('Booking record not found.', { status: 404 })
    }

    // 4. Query associated addons
    const { data: addons } = await supabase
      .from('booking_addons')
      .select('*, addons(*)')
      .eq('booking_id', bookingId)

    // 5. Generate PDF Stream Buffer
    const pdfBuffer = await renderToBuffer(
      <InvoiceDocument booking={booking} addons={addons || []} />
    )
    // Convert Node Buffer to Uint8Array for Web API compatibility
    const pdfBytes = new Uint8Array(pdfBuffer)

    // 6. Upload PDF to Supabase Storage and insert receipt record in background
    const storagePath = `booking_${bookingId}_receipt.pdf`
    const { data: uploadData, error: uploadErr } = await supabase
      .storage
      .from('receipts')
      .upload(storagePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadErr) {
      console.error('Failed to upload PDF receipt to storage:', uploadErr)
    } else {
      // Get storage public URL
      const { data: { publicUrl } } = supabase
        .storage
        .from('receipts')
        .getPublicUrl(storagePath)

      // Check if receipt already logged in database
      const { data: existingReceipt } = await supabase
        .from('receipts')
        .select('id')
        .eq('booking_id', bookingId)
        .maybeSingle()

      const receiptNumber = `INV-${format(new Date(), 'yyyyMMdd')}-${bookingId.substring(0, 4).toUpperCase()}`

      if (existingReceipt) {
        // Update existing receipt
        await supabase
          .from('receipts')
          .update({
            amount_paid: booking.advance_paid,
            pdf_storage_path: publicUrl,
          })
          .eq('id', existingReceipt.id)
      } else {
        // Insert new receipt
        await supabase
          .from('receipts')
          .insert({
            booking_id: bookingId,
            receipt_number: receiptNumber,
            amount_paid: booking.advance_paid,
            payment_method: 'cash',
            pdf_storage_path: publicUrl,
            created_by: user.id
          })
      }
    }

    // 7. Return response stream for view/download
    const fileName = `invoice_${booking.customer_name.replace(/\s+/g, '_')}_${booking.event_date}.pdf`
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
      },
    })

  } catch (error: any) {
    console.error('PDF generation endpoint error:', error)
    return new Response(`PDF generation failed: ${error.message}`, { status: 500 })
  }
}
