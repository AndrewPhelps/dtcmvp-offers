import InputsForm from '@/components/inputs/InputsForm';

export const metadata = {
  title: 'inputs — dtcmvp',
};

export default function InputsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-grotesk font-semibold text-text-primary">inputs</h1>
        <p className="text-sm text-text-muted font-grotesk mt-1">
          tell us about your store once — every swag personalizes to these numbers.
        </p>
      </header>
      <InputsForm mode="page" />
    </div>
  );
}
