import Link from "next/link";

export default function NotFound() {
  return (
    <div className="px-5 py-14 sm:px-8 lg:py-20">
      <div className="receipt-slip mx-auto max-w-md px-6 py-8">
        <p className="micro border-b border-dashed border-dark pb-4 text-center">A–OK / Error receipt</p>
        <h1 className="display-heading mt-6 text-center text-[clamp(52px,12vw,84px)]">
          Not on
          <br />
          <span className="text-primary">the receipt<span className="period-pulse">.</span></span>
        </h1>
        <div className="receipt-line mt-6 border-t border-dashed border-dark">
          <span>Status</span>
          <span>404</span>
        </div>
        <div className="receipt-line">
          <span>Page</span>
          <span>NOT FOUND</span>
        </div>
        <div className="receipt-line">
          <span>Confidence</span>
          <span>HIGH</span>
        </div>
        <div className="mt-4 flex justify-between border-t-2 border-dashed border-dark pt-4 text-[15px] font-bold">
          <span>STILL A–OK.</span>
          <span aria-hidden="true">✓</span>
        </div>
      </div>
      <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
        <Link href="/products" className="btn btn-primary justify-between gap-6">
          Shop the collection <span aria-hidden="true">↗</span>
        </Link>
        <Link href="/" className="btn btn-outline justify-between gap-6">
          Back home <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </div>
  );
}
