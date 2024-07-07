import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    background-color: #F5F5F5;
    color: #000;
    font-size: 16px;
    font-weight: 400;
    line-height: 1.5;
    font-family: 'Inter', sans-serif;
  }

  * {
    box-sizing: border-box;
  }

  #__next {
    justify-content: center;
    min-height: 100vh;
  }
`;

export default GlobalStyle;
