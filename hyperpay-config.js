export function getConfig() {
  return {
    title: 'HyperPay',
    paymentMethods: [
      {
        hostedPage: {
          title: 'HyperPay',
          billingAddressMandatoryFields: ['EMAIL']
        }
      }
    ],
    credentialsFields: [
      {
        simpleField: {
          name: 'siteUrl',
          label: 'Site URL'
        }
      }
    ]
  };
}
