import type { BillingCatalog, Capability, CatalogProduct } from './types'

export const DEV_BILLING_CATALOG: BillingCatalog = {
  version: 1,
  salesEnabled: false,
  purpose: 'development-assumption',
  products: [
    {
      productId: 'arin_premium_monthly',
      storeProductIds: {
        apple: 'arin.premium.monthly',
        google: 'arin_premium_monthly',
        test: 'arin.premium.monthly.test',
      },
      type: 'auto_renewable_subscription',
      subscriptionGroup: 'arin_premium',
      durationMs: 30 * 24 * 60 * 60 * 1000,
      entitlements: ['full_mock', 'extended_study'],
      title: '프리미엄 월간 (개발용 가정)',
      description:
        '개발용 가정 상품입니다. 실전 모의(정규)와 확장 학습 한도를 엽니다. 실제 판매 상품이 아닙니다.',
      terms:
        '자동 갱신 구독 가정입니다. 해지해도 남은 기간 동안은 이용할 수 있습니다. 판매 가격·체험 기간은 정해지지 않았습니다.',
      assumedDevPrice: { currency: 'KRW', amount: 4900, display: '₩4,900' },
    },
    {
      productId: 'arin_mock_pass_30d',
      storeProductIds: {
        apple: 'arin.mockpass.30d',
        google: 'arin_mock_pass_30d',
        test: 'arin.mockpass.30d.test',
      },
      type: 'non_renewing_period',
      subscriptionGroup: null,
      durationMs: 30 * 24 * 60 * 60 * 1000,
      entitlements: ['full_mock'],
      title: '실전 이용권 30일 (개발용 가정)',
      description:
        '개발용 가정 상품입니다. 30일 동안 실전 모의(정규)만 엽니다. 자동 갱신되지 않습니다.',
      terms:
        '기간이 끝나면 권한이 사라집니다. 최종 SKU 유형(비갱신 구독 vs 일회성)은 사용자 결정 사항입니다.',
      assumedDevPrice: { currency: 'KRW', amount: 9900, display: '₩9,900' },
    },
  ],
}

export function getProductById(
  catalog: BillingCatalog,
  productId: string,
): CatalogProduct | undefined {
  return catalog.products.find((product) => product.productId === productId)
}

export function getProductByStoreId(
  catalog: BillingCatalog,
  storeProductId: string,
): CatalogProduct | undefined {
  return catalog.products.find((product) =>
    Object.values(product.storeProductIds).includes(storeProductId),
  )
}

export function allStoreProductIds(catalog: BillingCatalog): string[] {
  return catalog.products.flatMap((product) => Object.values(product.storeProductIds))
}

export function uniqueCapabilities(list: Capability[]): Capability[] {
  return [...new Set(list)]
}
