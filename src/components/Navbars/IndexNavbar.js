/*!

=========================================================
* Paper Kit React - v1.3.1
=========================================================

* Product Page: https://www.creative-tim.com/product/paper-kit-react

* Copyright 2022 Creative Tim (https://www.creative-tim.com)
* Licensed under MIT (https://github.com/creativetimofficial/paper-kit-react/blob/main/LICENSE.md)

* Coded by Creative Tim

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/
import React from "react";
// nodejs library that concatenates strings
import classnames from "classnames";
// reactstrap components
import {
  Button,
  Collapse,
  NavbarBrand,
  Navbar,
  NavItem,
  NavLink,
  Nav,
  Container,
} from "reactstrap";

function IndexNavbar() {
  const [navbarColor, setNavbarColor] = React.useState("navbar-transparent");
  const [navbarCollapse, setNavbarCollapse] = React.useState(false);
  const [navbarTopPosition, setNavbarTopPosition] = React.useState("0px");

  const toggleNavbarCollapse = () => {
    setNavbarCollapse(!navbarCollapse);
    document.documentElement.classList.toggle("nav-open");
  };

  React.useEffect(() => {
    // Helps identify when to hide/show Navigation Bar
    var prevScrollpos = window.pageYOffset;

    const updateNavbarColor = () => {
      var currentScrollPos = window.pageYOffset;

      // #region Set correct navbar top position (Show or Hide it)
      setNavbarTopPosition(
        prevScrollpos <= currentScrollPos &&
          (document.documentElement.scrollTop > 299 ||
            document.body.scrollTop > 299)
          ? "-100px"
          : "0px"
      );
      prevScrollpos = currentScrollPos;
      // #endregion

      // #region Set correct Navigation Bar Color (Transparent on front page, White on the rest)
      if (
        document.documentElement.scrollTop > 299 ||
        document.body.scrollTop > 299
      ) {
        setNavbarColor("");
      } else if (
        document.documentElement.scrollTop < 300 ||
        document.body.scrollTop < 300
      ) {
        setNavbarColor("navbar-transparent");
      }
      // #endregion
    };

    window.addEventListener("scroll", updateNavbarColor);

    return function cleanup() {
      window.removeEventListener("scroll", updateNavbarColor);
    };
  });
  return (
    <Navbar
      className={classnames("fixed-top", navbarColor)}
      expand="lg"
      style={{
        top: navbarTopPosition,
        transition: "top 0.7s, background 0.5s",
      }}
    >
      <Container>
        <div className="navbar-translate">
          <NavbarBrand
            data-placement="bottom"
            href="/index"
            target="_blank"
            title="Coded by Creative Tim"
          >
            RehAStore
          </NavbarBrand>
          <button
            aria-expanded={navbarCollapse}
            className={classnames("navbar-toggler navbar-toggler", {
              toggled: navbarCollapse,
            })}
            onClick={toggleNavbarCollapse}
          >
            <span className="navbar-toggler-bar bar1" />
            <span className="navbar-toggler-bar bar2" />
            <span className="navbar-toggler-bar bar3" />
          </button>
        </div>
        <Collapse
          className="justify-content-end"
          navbar
          isOpen={navbarCollapse}
        >
          <Nav navbar>
            <NavItem>
              <NavLink
                data-placement="bottom"
                href="https://rehstore.arditi.pt/publisher"
                target="_blank"
                title="Developer Web-Pannel"
              >
                Publisher Web-Pannel
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                data-placement="bottom"
                href="https://rehstore.arditi.pt/api/account/register"
                target="_blank"
                title="Create your account, in order to use Reh@Store"
              >
                Create Account
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                data-placement="bottom"
                href="https://neurorehablab.arditi.pt/"
                target="_blank"
                title="More about NeuroRehabLab"
              >
                <i className="fa fa-brain" />
                <p className="d-lg-none">NeuroRehabLab</p>
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                data-placement="bottom"
                href="https://pt.linkedin.com/in/zlynt"
                target="_blank"
                title="More about Ivan Teixeira"
              >
                <i className="fa-brands fa-linkedin" />
                <p className="d-lg-none">Ivan Teixeira</p>
              </NavLink>
            </NavItem>
            {/*<NavItem>
              <NavLink
                href="https://demos.creative-tim.com/paper-kit-react/#/documentation?ref=pkr-index-navbar"
                target="_blank"
              >
                <i className="nc-icon nc-book-bookmark" /> Tutorials
              </NavLink>
            </NavItem>
           <NavItem>
              <Button
                className="btn-round"
                color="danger"
                href="https://www.creative-tim.com/product/paper-kit-pro-react?ref=pkr-index-navbar"
                target="_blank"
              >
                <i className="nc-icon nc-send"></i> Contacts
              </Button>
          </NavItem>*/}
          </Nav>
        </Collapse>
      </Container>
    </Navbar>
  );
}

export default IndexNavbar;
