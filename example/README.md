# React Benin Payments - Example App

This is an example Next.js application demonstrating the `react-benin-payments` package.

## Getting Started

1. First, build the main package:

```bash
cd ..
npm run build
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features Demonstrated

- **BeninPaymentProvider** - Global configuration wrapper
- **FedaPayButton** - Pre-built FedaPay payment button
- **KkiaPayButton** - Pre-built KKiaPay payment button
- **useFedaPay hook** - Custom/headless payment integration
- **formatXOF utility** - Currency formatting

## Notes

- This example uses `isTestMode={true}` - no real transactions occur
- Check the browser console for payment event logs
- The package is linked locally via `file:..`
