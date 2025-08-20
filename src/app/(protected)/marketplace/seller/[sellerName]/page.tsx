import SellerPageClient from './seller-page-client'

interface SellerPageProps {
  params: Promise<{
    sellerName: string
  }>
}

export default async function SellerPage({ params }: SellerPageProps) {
  const { sellerName } = await params
  return <SellerPageClient sellerName={sellerName} />
}