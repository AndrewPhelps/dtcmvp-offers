import { Offer } from '@/types';

export const offers: Offer[] = [
  {
    id: 'nofraud-audit',
    partnerId: 'nofraud',
    name: 'Free Fraud Audit',
    shortDescription: 'Uncover hidden fraud patterns and bad actors in your order history',
    fullDescription: `Get a diagnostic review of your recent transactions to identify fraud patterns, policy abuse, and bad actors you may have missed. NoFraud's analysts will analyze your order data and provide actionable insights on where you're losing money to fraud.`,
    categoryId: 'operations',
    tagIds: ['fraud', 'security', 'audit'],
    isActive: true,
    formFields: [
      { id: 'store_url', type: 'url', label: 'Store URL', required: true },
      { id: 'monthly_orders', type: 'select', label: 'Monthly order volume', required: true, options: ['<1k', '1k-5k', '5k-10k', '10k-25k', '25k+'] },
      { id: 'current_solution', type: 'text', label: 'Current fraud solution', required: false, placeholder: 'e.g., Signifyd, manual review, none' },
      { id: 'biggest_concern', type: 'textarea', label: 'Biggest fraud concern', required: false, placeholder: 'What fraud challenges are you facing?' },
    ],
    status: 'active',
    createdAt: '2024-01-15',
  },
  {
    id: 'orita-audit',
    partnerId: 'orita',
    name: 'Klaviyo Subscriber Engagement Audit',
    shortDescription: 'Discover which subscribers are actually engaged and which are hurting your deliverability',
    fullDescription: `Get a detailed analysis of your Klaviyo subscriber list to identify engagement patterns, dormant subscribers dragging down your deliverability, and opportunities to improve campaign performance. Orita will segment your list and show you exactly where you're leaving money on the table.`,
    categoryId: 'email-sms-subscribers',
    tagIds: ['email', 'klaviyo', 'engagement', 'audit'],
    isActive: true,
    formFields: [
      { id: 'store_url', type: 'url', label: 'Store URL', required: true },
      { id: 'klaviyo_size', type: 'select', label: 'Klaviyo account size', required: true, options: ['<10k', '10k-50k', '50k-100k', '100k-500k', '500k+'] },
      { id: 'send_frequency', type: 'select', label: 'Current email send frequency', required: true, options: ['Daily', '2-3x/week', 'Weekly', 'Less than weekly'] },
      { id: 'email_challenge', type: 'textarea', label: 'Biggest email challenge', required: false, placeholder: 'What email marketing challenges are you facing?' },
    ],
    status: 'active',
    createdAt: '2024-01-20',
  },
  {
    id: 'treet-audit',
    partnerId: 'treet',
    name: 'Resale Marketplace Audit',
    shortDescription: 'See how much revenue you\'re losing to eBay and Poshmark resellers',
    fullDescription: `Get a breakdown of your brand's presence on third-party resale marketplaces like eBay, Poshmark, and ThredUp. Treet will analyze resale activity for your products and show you the revenue opportunity you're missing by not owning your resale channel.`,
    categoryId: 'marketplaces',
    tagIds: ['resale', 'marketplace', 'sustainability'],
    isActive: true,
    formFields: [
      { id: 'brand_name', type: 'text', label: 'Brand name', required: true },
      { id: 'store_url', type: 'url', label: 'Store URL', required: true },
      { id: 'product_category', type: 'select', label: 'Product category', required: true, options: ['Apparel', 'Footwear', 'Accessories', 'Home', 'Other'] },
      { id: 'has_resale', type: 'select', label: 'Do you currently have a resale program?', required: true, options: ['Yes', 'No', 'Considering'] },
    ],
    status: 'active',
    createdAt: '2024-02-01',
  },
  {
    id: 'aix-audit',
    partnerId: 'aix',
    name: 'Amazon Clarity Audit',
    shortDescription: 'Discover thousands in wasted Amazon ad spend you didn\'t know existed',
    fullDescription: `Amazon provides the answers — just not in one place. The Amazon Clarity Audit pulls seven separate Amazon reports into a single source of truth, so revenue, ad spend, and efficiency can be evaluated together instead of in isolation.

In 7 days, you'll get:
• A clear diagnosis of what's actually driving results
• Specific waste and leakage identified (it's more than you think)
• Portfolio and campaign structure review with a clear path forward
• Product-level insights showing which ASINs deserve more budget
• A prioritized 30-Day Action Plan with specific changes and expected impact

Recent audits have found $300K+ in wasted spend and $75K-$150K in unlockable incremental ad sales.`,
    claimInstructions: `1. Review NDA
2. Grant view-only Seller Central access
3. AIX conducts audit (7 days)
4. Review findings together on a call`,
    categoryId: 'marketplaces',
    tagIds: ['amazon', 'advertising', 'audit', 'ppc'],
    isActive: true,
    formFields: [
      { id: 'brand_name', type: 'text', label: 'Brand name', required: true },
      { id: 'store_url', type: 'url', label: 'Store URL', required: true },
      { id: 'account_type', type: 'select', label: 'Amazon Seller Central or Vendor Central?', required: true, options: ['Seller Central', 'Vendor Central', 'Both'] },
      { id: 'monthly_spend', type: 'select', label: 'Monthly Amazon ad spend', required: true, options: ['<$10k', '$10k-$25k', '$25k-$50k', '$50k-$100k', '$100k+'] },
      { id: 'product_category', type: 'text', label: 'Primary product category on Amazon', required: false, placeholder: 'e.g., Health & Household, Beauty' },
      { id: 'biggest_challenge', type: 'textarea', label: 'What\'s your biggest Amazon challenge right now?', required: false },
    ],
    status: 'active',
    createdAt: '2024-02-10',
  },
  {
    id: 'polar-test',
    partnerId: 'polar',
    name: 'AI Analytics Test Drive',
    shortDescription: 'Test Claude AI with your Shopify data using 10 free prompts',
    fullDescription: `Experience the power of AI-driven analytics with your own data. Polar will set up Claude with access to your Shopify metrics so you can ask questions, get insights, and see what AI-powered analysis can do for your brand. You'll get 10 prompts to explore your data in ways spreadsheets never could.

What you can ask:
• "What's driving my CAC increase this month?"
• "Which products should I reorder and when?"
• "How is my email performance trending vs. paid?"
• "What would happen if I cut Meta spend by 20%?"`,
    categoryId: 'analytics-insights',
    tagIds: ['analytics', 'ai', 'data', 'shopify'],
    isActive: true,
    formFields: [
      { id: 'store_url', type: 'url', label: 'Store URL', required: true },
      { id: 'monthly_revenue', type: 'select', label: 'Monthly revenue', required: true, options: ['<$100k', '$100k-$500k', '$500k-$1M', '$1M-$5M', '$5M+'] },
      { id: 'data_questions', type: 'textarea', label: 'What data questions keep you up at night?', required: false, placeholder: 'What would you want to ask an AI about your business?' },
    ],
    status: 'active',
    createdAt: '2024-02-15',
  },
  {
    id: 'finsi-audit',
    partnerId: 'finsi',
    name: 'Subscription Data Deep Dive',
    shortDescription: 'Get AI-powered insights into your subscription metrics and retention opportunities',
    fullDescription: `Stop guessing about your subscription performance. Finsi will analyze your Recharge/subscription data alongside your Shopify and marketing data to deliver a comprehensive report on your retention intelligence, predictive LTV, and where you're leaving money on the table.

You'll get insights on:
• Churn risk segments and intervention opportunities
• LTV predictions by cohort and acquisition source
• Subscription vs. one-time purchase behavior patterns
• Specific recommendations to improve retention`,
    categoryId: 'retention-loyalty',
    tagIds: ['subscription', 'retention', 'ltv', 'churn'],
    isActive: true,
    formFields: [
      { id: 'store_url', type: 'url', label: 'Store URL', required: true },
      { id: 'subscription_platform', type: 'select', label: 'Subscription platform', required: true, options: ['Recharge', 'Skio', 'Smartrr', 'Loop', 'Other'] },
      { id: 'monthly_revenue', type: 'select', label: 'Monthly subscription revenue', required: true, options: ['<$50k', '$50k-$200k', '$200k-$500k', '$500k+'] },
      { id: 'retention_challenge', type: 'textarea', label: 'Biggest subscription/retention challenge', required: false },
    ],
    status: 'active',
    createdAt: '2024-02-20',
  },
  {
    id: 'enavi-audit',
    partnerId: 'enavi',
    name: 'Google Analytics & CRO Audit',
    shortDescription: 'Uncover why visitors aren\'t converting with a data-driven CRO analysis',
    fullDescription: `Get a comprehensive audit of your Shopify store's conversion performance. Enavi will analyze your Google Analytics data alongside customer behavior patterns to identify exactly where you're losing potential customers and what's blocking conversions.

You'll receive:
• Funnel analysis showing where visitors drop off
• Page-level conversion insights
• Customer journey friction points
• Prioritized list of optimization opportunities
• Quick wins you can implement immediately`,
    categoryId: 'analytics-insights',
    tagIds: ['cro', 'conversion', 'analytics', 'optimization'],
    isActive: true,
    formFields: [
      { id: 'store_url', type: 'url', label: 'Store URL', required: true },
      { id: 'monthly_traffic', type: 'select', label: 'Monthly traffic', required: true, options: ['<10k', '10k-50k', '50k-100k', '100k+'] },
      { id: 'conversion_rate', type: 'text', label: 'Current conversion rate', required: false, placeholder: 'e.g., 2.5%' },
      { id: 'cro_experience', type: 'select', label: 'Have you done CRO work before?', required: true, options: ['Yes - in-house', 'Yes - with an agency', 'No'] },
    ],
    status: 'active',
    createdAt: '2024-03-01',
  },
  {
    id: 'favsolution-audit',
    partnerId: 'favsolution',
    name: 'Site Speed Audit',
    shortDescription: 'Find out what\'s slowing down your store and costing you conversions',
    fullDescription: `Slow sites kill conversions. Fav Solution will analyze your Shopify store's performance to identify exactly what's dragging down your page speed and provide a prioritized fix list.

The audit covers:
• Core Web Vitals analysis (LCP, FID, CLS)
• App bloat identification
• Theme code inefficiencies
• Image and asset optimization opportunities
• Third-party script impact assessment
• Mobile vs. desktop performance gaps`,
    categoryId: 'site-checkout',
    tagIds: ['speed', 'performance', 'shopify', 'optimization'],
    isActive: true,
    formFields: [
      { id: 'store_url', type: 'url', label: 'Store URL', required: true },
      { id: 'shopify_plan', type: 'select', label: 'Shopify plan', required: true, options: ['Basic', 'Shopify', 'Advanced', 'Plus'] },
      { id: 'speed_issues', type: 'textarea', label: 'Are you experiencing specific speed issues?', required: false },
    ],
    status: 'active',
    createdAt: '2024-03-05',
  },
  {
    id: 'goaudience-report',
    partnerId: 'goaudience',
    name: 'Personas Breakdown Report',
    shortDescription: 'Discover who your best customers actually are with AI-driven persona analysis',
    fullDescription: `Stop guessing who your customers are. GoAudience will analyze your customer data to generate data-driven persona profiles that show you exactly who's buying, why they buy, and how to find more of them.

Your report includes:
• AI-generated customer personas based on actual purchase behavior
• Segment-level insights on acquisition source, LTV, and purchase patterns
• Creative and messaging recommendations for each persona
• Audience recommendations for Meta and TikTok targeting`,
    categoryId: 'analytics-insights',
    tagIds: ['personas', 'audience', 'segmentation', 'targeting'],
    isActive: true,
    formFields: [
      { id: 'store_url', type: 'url', label: 'Store URL', required: true },
      { id: 'monthly_orders', type: 'select', label: 'Monthly orders', required: true, options: ['<500', '500-2k', '2k-5k', '5k-10k', '10k+'] },
      { id: 'primary_channel', type: 'select', label: 'Primary acquisition channel', required: true, options: ['Meta', 'Google', 'TikTok', 'Organic', 'Email', 'Other'] },
      { id: 'has_personas', type: 'select', label: 'Do you have defined customer personas today?', required: true, options: ['Yes', 'Somewhat', 'No'] },
    ],
    status: 'active',
    createdAt: '2024-03-10',
  },
  {
    id: 'onward-model',
    partnerId: 'onward',
    name: 'Premiums Financial Impact Model',
    shortDescription: 'See exactly how much revenue shipping protection and post-purchase premiums could generate',
    fullDescription: `Onward will build a custom financial model based on your order data to show the revenue potential of adding shipping protection and post-purchase premiums to your store.

The model includes:
• Projected premium attach rate based on your AOV and category
• Revenue projection for shipping protection
• Claims cost offset analysis
• Net profit impact over 12 months
• Comparison to your current post-purchase revenue (if any)`,
    categoryId: 'retention-loyalty',
    tagIds: ['shipping', 'protection', 'revenue', 'post-purchase'],
    isActive: true,
    formFields: [
      { id: 'store_url', type: 'url', label: 'Store URL', required: true },
      { id: 'monthly_orders', type: 'select', label: 'Monthly orders', required: true, options: ['<1k', '1k-5k', '5k-10k', '10k-25k', '25k+'] },
      { id: 'aov', type: 'select', label: 'Average order value', required: true, options: ['<$50', '$50-$100', '$100-$200', '$200-$500', '$500+'] },
      { id: 'has_protection', type: 'select', label: 'Do you currently offer shipping protection?', required: true, options: ['Yes', 'No'] },
    ],
    status: 'active',
    createdAt: '2024-03-15',
  },
  {
    id: 'shopvision-session',
    partnerId: 'shopvision',
    name: 'Free AI Prompting Session',
    shortDescription: 'Ask any question about your competitors and market - get answers in real-time',
    fullDescription: `Get a hands-on session with Shopvision's AI Super Agent alongside a solutions engineer. Bring your toughest competitive intelligence questions and see what the platform can uncover about your market.

In this session, you can explore:
• What promotions are your competitors running right now?
• How have their prices changed over the past 90 days?
• What's their email and ad strategy look like?
• Where are they investing their marketing budget?

Walk away with actionable competitive insights and a clear picture of how AI can power your market intelligence.`,
    categoryId: 'analytics-insights',
    tagIds: ['competitive', 'intelligence', 'ai', 'market'],
    isActive: true,
    formFields: [
      { id: 'store_url', type: 'url', label: 'Store URL', required: true },
      { id: 'competitors', type: 'textarea', label: 'Top 3 competitors', required: true, placeholder: 'List your main competitors' },
      { id: 'questions', type: 'textarea', label: 'What competitive questions would you most like answered?', required: false },
    ],
    status: 'active',
    createdAt: '2024-03-20',
  },
  {
    id: 'rivo-audit',
    partnerId: 'rivo',
    name: 'Loyalty Program & Website Audit',
    shortDescription: 'See how your loyalty and retention stack compares to top-performing brands',
    fullDescription: `Rivo will audit your current loyalty setup (or lack thereof) and benchmark it against high-performing Shopify brands in your category.

The audit covers:
• Current retention rate and repeat purchase analysis
• Loyalty program structure evaluation (if you have one)
• Referral program opportunities
• VIP tier and membership potential
• Website integration and visibility assessment
• Recommendations based on what's working for similar brands`,
    categoryId: 'retention-loyalty',
    tagIds: ['loyalty', 'retention', 'referral', 'vip'],
    isActive: true,
    formFields: [
      { id: 'store_url', type: 'url', label: 'Store URL', required: true },
      { id: 'has_loyalty', type: 'select', label: 'Do you have a loyalty program?', required: true, options: ['Yes - Rivo', 'Yes - Other', 'No'] },
      { id: 'monthly_orders', type: 'select', label: 'Monthly orders', required: true, options: ['<1k', '1k-5k', '5k-10k', '10k+'] },
      { id: 'retention_challenge', type: 'textarea', label: 'What\'s your biggest retention challenge?', required: false },
    ],
    status: 'active',
    createdAt: '2024-03-25',
  },
  {
    id: 'postscript-audit',
    partnerId: 'postscript',
    name: 'SMS Audit Deep Dive',
    shortDescription: 'Find out if your SMS program is performing at its full potential',
    fullDescription: `Postscript will analyze your current SMS marketing performance and benchmark it against top-performing brands in your category.

The audit covers:
• List growth rate and subscriber quality analysis
• Campaign performance (CTR, conversion, revenue per message)
• Flow/automation effectiveness
• Compliance and deliverability health check
• Comparison to category benchmarks
• Specific opportunities to increase SMS revenue`,
    categoryId: 'email-sms-subscribers',
    tagIds: ['sms', 'marketing', 'audit', 'mobile'],
    isActive: true,
    formFields: [
      { id: 'store_url', type: 'url', label: 'Store URL', required: true },
      { id: 'sms_platform', type: 'select', label: 'Current SMS platform', required: true, options: ['Postscript', 'Attentive', 'Klaviyo SMS', 'Other', 'None'] },
      { id: 'list_size', type: 'select', label: 'SMS list size', required: true, options: ['<5k', '5k-25k', '25k-100k', '100k+'] },
      { id: 'sms_revenue', type: 'select', label: 'What percentage of revenue comes from SMS?', required: true, options: ['<5%', '5-10%', '10-20%', '20%+', "Don't know"] },
    ],
    status: 'active',
    createdAt: '2024-04-01',
  },
  {
    id: 'kodif-audit',
    partnerId: 'kodif',
    name: 'CX Ticket Audit',
    shortDescription: 'Discover how much of your support ticket volume could be automated with AI',
    fullDescription: `Kodif will analyze a sample of your customer support tickets to identify automation opportunities and efficiency gains.

The audit reveals:
• Ticket categorization breakdown (what are customers asking about?)
• Percentage of tickets suitable for AI automation
• Current handle time vs. potential with automation
• High-volume repetitive queries that can be deflected
• Estimated cost savings and productivity improvements
• Implementation roadmap for AI-powered support`,
    categoryId: 'operations',
    tagIds: ['cx', 'support', 'automation', 'ai'],
    isActive: true,
    formFields: [
      { id: 'store_url', type: 'url', label: 'Store URL', required: true },
      { id: 'helpdesk', type: 'select', label: 'Current helpdesk platform', required: true, options: ['Gorgias', 'Zendesk', 'Freshdesk', 'Intercom', 'Other'] },
      { id: 'ticket_volume', type: 'select', label: 'Monthly ticket volume', required: true, options: ['<500', '500-2k', '2k-5k', '5k-10k', '10k+'] },
      { id: 'response_time', type: 'select', label: 'Average first response time', required: true, options: ['<1 hour', '1-4 hours', '4-24 hours', '24+ hours'] },
    ],
    status: 'active',
    createdAt: '2024-04-05',
  },
  {
    id: 'shoptin-audit',
    partnerId: 'shoptin',
    name: 'Net New Subscriber Impact Audit',
    shortDescription: 'See how many subscribers you\'re losing at checkout and what you could capture',
    fullDescription: `Shoptin will analyze your current checkout consent setup and show you exactly how many potential subscribers you're missing.

The audit includes:
• Current opt-in rate vs. Shoptin benchmark (20%+ improvement typical)
• Projected net new subscribers per month
• LTV impact of additional subscribers (subscribers have 40% higher LTV)
• Compliance gap analysis by region
• Revenue forecast from improved subscriber capture`,
    categoryId: 'email-sms-subscribers',
    tagIds: ['subscribers', 'checkout', 'opt-in', 'compliance'],
    isActive: true,
    formFields: [
      { id: 'store_url', type: 'url', label: 'Store URL', required: true },
      { id: 'monthly_checkouts', type: 'select', label: 'Monthly checkouts', required: true, options: ['<1k', '1k-5k', '5k-10k', '10k-25k', '25k+'] },
      { id: 'optin_rate', type: 'text', label: 'Current checkout opt-in rate', required: false, placeholder: 'e.g., 12%' },
      { id: 'markets', type: 'select', label: 'Primary markets', required: true, options: ['US only', 'US + Canada', 'US + EU', 'Global'] },
    ],
    status: 'active',
    createdAt: '2024-04-10',
  },
  {
    id: 'postpilot-test',
    partnerId: 'postpilot',
    name: 'Direct Mail Test Campaign',
    shortDescription: 'Test direct mail with a free spend credit and see the results for yourself',
    fullDescription: `Direct mail is the only marketing channel that's actually getting easier - high open rates, no spam filters, and it reaches customers that email can't. PostPilot will set you up with a test campaign to prove the ROI.

What you get:
• Free spend credit toward your first campaign
• Strategic campaign recommendation (winback, VIP, prospecting)
• Creative design support
• Full tracking and attribution reporting
• Dedicated success manager to walk through results`,
    categoryId: 'advertising-acquisition',
    tagIds: ['direct-mail', 'acquisition', 'retention', 'offline'],
    isActive: true,
    formFields: [
      { id: 'store_url', type: 'url', label: 'Store URL', required: true },
      { id: 'monthly_revenue', type: 'select', label: 'Monthly revenue', required: true, options: ['<$100k', '$100k-$500k', '$500k-$1M', '$1M-$5M', '$5M+'] },
      { id: 'dm_experience', type: 'select', label: 'Have you done direct mail before?', required: true, options: ['Yes - recently', 'Yes - in the past', 'No'] },
      { id: 'goal', type: 'select', label: 'Primary goal', required: true, options: ['Winback lapsed customers', 'Acquire new customers', 'Retain VIPs', 'Not sure'] },
    ],
    status: 'active',
    createdAt: '2024-04-15',
  },
  {
    id: 'applovin-credit',
    partnerId: 'applovin',
    name: '$20k Axon Spend Credit',
    shortDescription: 'Test mobile advertising with $20k in free ad spend on the Axon platform',
    fullDescription: `Axon by AppLovin gives you access to over a billion mobile users with AI-powered targeting that optimizes for your best customers. This exclusive offer lets you test the platform risk-free.

What you get:
• $20,000 in ad spend credit
• Access to 1B+ daily active mobile users
• AI-driven targeting and optimization
• Full ROI tracking and attribution
• Onboarding support to launch your first campaigns`,
    categoryId: 'advertising-acquisition',
    tagIds: ['mobile', 'advertising', 'acquisition', 'credit'],
    isActive: true,
    formFields: [
      { id: 'store_url', type: 'url', label: 'Store URL', required: true },
      { id: 'monthly_ad_spend', type: 'select', label: 'Monthly ad spend across all channels', required: true, options: ['<$25k', '$25k-$100k', '$100k-$500k', '$500k+'] },
      { id: 'primary_channels', type: 'select', label: 'Primary acquisition channels today', required: true, options: ['Meta', 'Google', 'TikTok', 'Other'] },
      { id: 'mobile_experience', type: 'select', label: 'Have you run mobile app install campaigns before?', required: true, options: ['Yes', 'No'] },
    ],
    status: 'active',
    createdAt: '2024-04-20',
  },
  {
    id: 'rokt-test',
    partnerId: 'rokt',
    name: 'Free ROI Calculator & Test',
    shortDescription: 'See exactly how much revenue you\'re leaving on the table at checkout',
    fullDescription: `Rokt will analyze your checkout flow and build a custom ROI model showing the revenue potential of monetizing your transaction moment.

What you get:
• Custom ROI projection based on your traffic and AOV
• Breakdown of revenue opportunities (upsells, post-purchase, third-party offers)
• Comparison to category benchmarks
• Free pilot program to test with live traffic
• Full attribution and reporting during pilot`,
    categoryId: 'advertising-acquisition',
    tagIds: ['checkout', 'upsell', 'monetization', 'revenue'],
    isActive: true,
    formFields: [
      { id: 'store_url', type: 'url', label: 'Store URL', required: true },
      { id: 'monthly_orders', type: 'select', label: 'Monthly orders', required: true, options: ['<5k', '5k-25k', '25k-100k', '100k+'] },
      { id: 'aov', type: 'select', label: 'Average order value', required: true, options: ['<$50', '$50-$100', '$100-$200', '$200+'] },
      { id: 'monetize_post', type: 'select', label: 'Do you currently monetize post-purchase?', required: true, options: ['Yes', 'No', 'Considering'] },
    ],
    status: 'active',
    createdAt: '2024-04-25',
  },
  {
    id: 'pdq-analyzer',
    partnerId: 'pdq',
    name: 'Checkout Optimization Analyzer',
    shortDescription: 'See how much revenue you\'re losing to a one-size-fits-all checkout',
    fullDescription: `PDQ will analyze your checkout data to identify optimization opportunities and project the revenue impact of personalized checkout experiences.

The analysis includes:
• Checkout conversion rate by segment
• Shipping option performance analysis
• Geographic and behavioral segment identification
• Revenue opportunity from checkout personalization
• A/B test recommendations
• ROI projection with guaranteed results`,
    categoryId: 'site-checkout',
    tagIds: ['checkout', 'optimization', 'conversion', 'shipping'],
    isActive: true,
    formFields: [
      { id: 'store_url', type: 'url', label: 'Store URL', required: true },
      { id: 'monthly_checkouts', type: 'select', label: 'Monthly checkouts', required: true, options: ['<5k', '5k-25k', '25k-100k', '100k+'] },
      { id: 'aov', type: 'select', label: 'Average order value', required: true, options: ['<$50', '$50-$100', '$100-$200', '$200+'] },
      { id: 'shipping_options', type: 'select', label: 'Do you currently offer multiple shipping options?', required: true, options: ['Yes', 'No'] },
    ],
    status: 'active',
    createdAt: '2024-05-01',
  },
  {
    id: 'dashfi-audit',
    partnerId: 'dashfi',
    name: 'Ad Spend Audit Report',
    shortDescription: 'Find out if Google and Meta are overcharging you (they probably are)',
    fullDescription: `Dashfi's Ad Pay Agent will audit your Google and Meta advertising accounts to identify billing errors, overcharges, and discrepancies you may be owed refunds for.

Recent audits have found an average of 12.5% in monthly billing discrepancies. The audit is free - Dashfi only takes 50% of what they recover for you.

The audit covers:
• Historical billing analysis across Google and Meta
• Identification of duplicate charges and errors
• Invalid click and impression detection
• Refund recovery support
• Ongoing monitoring setup`,
    categoryId: 'operations',
    tagIds: ['advertising', 'audit', 'billing', 'recovery'],
    isActive: true,
    formFields: [
      { id: 'store_url', type: 'url', label: 'Store URL', required: true },
      { id: 'meta_spend', type: 'select', label: 'Monthly ad spend on Meta', required: true, options: ['<$10k', '$10k-$50k', '$50k-$100k', '$100k+'] },
      { id: 'google_spend', type: 'select', label: 'Monthly ad spend on Google', required: true, options: ['<$10k', '$10k-$50k', '$50k-$100k', '$100k+'] },
      { id: 'audited_before', type: 'select', label: 'Have you ever audited your ad billing?', required: true, options: ['Yes', 'No'] },
    ],
    status: 'active',
    createdAt: '2024-05-05',
  },
];

export const getOffer = (id: string): Offer | undefined => {
  return offers.find((o) => o.id === id);
};

export const getOffersByCategoryId = (categoryId: string): Offer[] => {
  return offers.filter((o) => o.categoryId === categoryId && o.isActive);
};

export const getOffersByPartner = (partnerId: string): Offer[] => {
  return offers.filter((o) => o.partnerId === partnerId);
};

export const getActiveOffers = (): Offer[] => {
  return offers.filter((o) => o.isActive);
};
