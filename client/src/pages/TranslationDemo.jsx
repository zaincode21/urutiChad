import React, { useState } from 'react';
import TranslatedText from '../components/TranslatedText';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useTranslation } from '../hooks/useTranslation';

const TranslationDemo = () => {
  const { t, tSync, language, translateBatch } = useTranslation();
  const [batchResults, setBatchResults] = useState([]);

  const handleBatchTranslation = async () => {
    const texts = [
      "Welcome to our store",
      "Add to cart",
      "Checkout now",
      "Thank you for your purchase"
    ];
    
    const results = await translateBatch(texts);
    setBatchResults(results);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          <TranslatedText text="Translation System Demo" />
        </h1>
        <LanguageSwitcher />
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">
          <TranslatedText text="Current Language" />: {language}
        </h2>
        
        <div className="space-y-2">
          <p className="text-gray-600">
            <TranslatedText text="This text will be automatically translated based on your selected language." />
          </p>
          
          <p className="text-gray-600">
            <TranslatedText text="The translation system uses smart caching to improve performance." />
          </p>
          
          <p className="text-gray-600">
            <TranslatedText text="Try switching languages using the dropdown above to see the translations in action." />
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">
          <TranslatedText text="Common UI Elements" />
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <TranslatedText text="Save Changes" />
          </button>
          
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <TranslatedText text="Create New" />
          </button>
          
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            <TranslatedText text="Delete Item" />
          </button>
          
          <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
            <TranslatedText text="Cancel" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">
          <TranslatedText text="Batch Translation Demo" />
        </h2>
        
        <button 
          onClick={handleBatchTranslation}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <TranslatedText text="Translate Multiple Texts" />
        </button>
        
        {batchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="font-medium text-gray-800">
              <TranslatedText text="Batch Translation Results" />:
            </h3>
            <ul className="space-y-1">
              {batchResults.map((result, index) => (
                <li key={index} className="text-gray-600 bg-gray-50 p-2 rounded">
                  {result}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">
          <TranslatedText text="Product Management" />
        </h2>
        
        <div className="space-y-2">
          <p><TranslatedText text="Products" />: <span className="font-medium">156</span></p>
          <p><TranslatedText text="Categories" />: <span className="font-medium">12</span></p>
          <p><TranslatedText text="Brands" />: <span className="font-medium">8</span></p>
          <p><TranslatedText text="Shops" />: <span className="font-medium">3</span></p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">
          <TranslatedText text="System Information" />
        </h2>
        
        <div className="text-sm text-gray-600 space-y-1">
          <p><TranslatedText text="Translation API" />: MyMemory (Free)</p>
          <p><TranslatedText text="Cache Status" />: Active</p>
          <p><TranslatedText text="Supported Languages" />: 20+</p>
          <p><TranslatedText text="Current Language" />: {language}</p>
        </div>
      </div>
    </div>
  );
};

export default TranslationDemo;