declare interface IHelloWorldApplicationCustomizerStrings {
  Title: string;
  MyLinks: string;
  ToggleButtonOpen: string;
  ToggleButtonClose: string;
  Edit: string;
  EditTitle: string;
  MyLinksSaveSuccess: string;
  MyLinksSaveFailed: string;
}

declare module 'HelloWorldApplicationCustomizerStrings' {
  const strings: IHelloWorldApplicationCustomizerStrings;
  export = strings;
}