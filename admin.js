(function () {
  "use strict";

  /* =========================================================
     SUPABASE
  ========================================================= */

  const SUPABASE_URL = "https://xlizmfqzcfrbojkaugtk.supabase.co";
  const SUPABASE_KEY = "sb_publishable_SOwQqXfZ0wg8wuEdOMAwEg_o-DUqxhE";

  const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  /* =========================================================
     GLOBAL STATE
  ========================================================= */

  var currentProducts = [];
  var currentGallery = [];
  var currentContent = {};
  var currentVideo = {};

  /* =========================================================
     CHECK OWNER AUTHENTICATION
  ========================================================= */

  async function checkAuthentication() {
    try {
      var result = await supabaseClient.auth.getSession();
      var session = result.data.session;

      if (!session) {
        window.location.href = "login.html";
        return;
      }

      var userEmail =
        session.user && session.user.email
          ? session.user.email
          : "Owner";

      var badge = document.getElementById("adminUserBadge");

      if (badge) {
        badge.innerHTML =
          "Logged in as: <strong>" +
          escapeHtml(userEmail) +
          "</strong>";
      }

      initAdminPanel();

    } catch (error) {
      console.error("Authentication error:", error);
      window.location.href = "login.html";
    }
  }

  /* =========================================================
     INITIALIZE ADMIN PANEL
  ========================================================= */

  function initAdminPanel() {
    setupNavigation();
    setupAuthActions();
    setupProductModal();
    setupGalleryActions();
    setupVideoActions();
    setupContentActions();
    setupSecurityActions();

    loadProducts();
    loadPublicData();
  }

  /* =========================================================
     TOAST
  ========================================================= */

  function showToast(msg, type) {
    var toast = document.getElementById("toast");

    if (!toast) return;

    toast.textContent = msg;

    toast.style.background =
      type === "error"
        ? "#EF4444"
        : type === "success"
          ? "#10B981"
          : "#1E293B";

    toast.style.display = "block";

    setTimeout(function () {
      toast.style.display = "none";
    }, 3500);
  }

  /* =========================================================
     NAVIGATION
  ========================================================= */

  function setupNavigation() {
    var navLinks =
      document.querySelectorAll(".admin-nav__link");

    var panels =
      document.querySelectorAll(".tab-panel");

    navLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        var targetTab = link.dataset.tab;

        navLinks.forEach(function (l) {
          l.classList.remove("is-active");
        });

        panels.forEach(function (p) {
          p.classList.remove("is-active");
        });

        link.classList.add("is-active");

        var activePanel =
          document.getElementById(targetTab);

        if (activePanel) {
          activePanel.classList.add("is-active");
        }
      });
    });
  }

  /* =========================================================
     LOGOUT
  ========================================================= */

  function setupAuthActions() {
    var logoutBtn =
      document.getElementById("logoutBtn");

    if (!logoutBtn) return;

    logoutBtn.addEventListener("click", async function () {
      logoutBtn.disabled = true;
      logoutBtn.textContent = "Logging out...";

      var result =
        await supabaseClient.auth.signOut();

      if (result.error) {
        console.error("Logout error:", result.error);

        logoutBtn.disabled = false;
        logoutBtn.textContent = "Logout";

        showToast("Logout failed.", "error");
        return;
      }

      window.location.href = "login.html";
    });
  }

  /* =========================================================
     PRODUCTS - LOAD
  ========================================================= */

  async function loadProducts() {
    var result =
      await supabaseClient
        .from("products")
        .select("*")
        .order("created_at", {
          ascending: false
        });

    if (result.error) {
      console.error(
        "Error fetching products:",
        result.error
      );

      showToast(
        "Could not load products.",
        "error"
      );

      return;
    }

    currentProducts =
      result.data || [];

    renderProductsTable(
      currentProducts
    );

    updateProductStats(
      currentProducts
    );
  }

  /* =========================================================
     PRODUCT STATS
  ========================================================= */

  function updateProductStats(products) {
    var total = products.length;

    var published =
      products.filter(function (p) {
        return p.visible !== false;
      }).length;

    var hidden =
      total - published;

    var totalElement =
      document.getElementById(
        "statTotalProducts"
      );

    var publishedElement =
      document.getElementById(
        "statPublishedProducts"
      );

    var hiddenElement =
      document.getElementById(
        "statHiddenProducts"
      );

    if (totalElement) {
      totalElement.textContent = total;
    }

    if (publishedElement) {
      publishedElement.textContent =
        published;
    }

    if (hiddenElement) {
      hiddenElement.textContent =
        hidden;
    }
  }

  /* =========================================================
     PRODUCTS TABLE
  ========================================================= */

  function renderProductsTable(products) {
    var tbody =
      document.getElementById(
        "adminProductsTableBody"
      );

    if (!tbody) return;

    if (products.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--admin-soft);">No products added yet. Click "Add New Product" to create your first product.</td></tr>';

      return;
    }

    var html =
      products.map(function (p) {
        var isVisible =
          p.visible !== false;

        var isInStock =
          p.in_stock !== false;

        var statusBadge =
          isVisible
            ? '<span class="status-badge status-badge--published">Published</span>'
            : '<span class="status-badge status-badge--hidden">Hidden</span>';

        var stockBadge =
          isInStock
            ? '<span class="status-badge status-badge--instock">In Stock</span>'
            : '<span class="status-badge status-badge--outstock">Out of Stock</span>';

        var priceDisplay =
          p.price &&
            String(p.price).trim() !== ""
            ? "Rs " +
            parseFloat(
              p.price
            ).toLocaleString()
            : '<em style="color:#9CA3AF">Ask for price</em>';

        var imgSrc =
          p.image ||
          "assets/images/camera-product-shot.jpg";

        return [
          "<tr>",

          '<td><img src="' +
          escapeHtml(imgSrc) +
          '" class="product-thumb" alt="' +
          escapeHtml(p.name) +
          '"></td>',

          "<td>",

          "<strong>" +
          escapeHtml(p.name) +
          "</strong>",

          p.specifications
            ? '<br><small style="color:var(--admin-soft)">' +
            escapeHtml(
              p.specifications
            ) +
            "</small>"
            : "",

          "</td>",

          "<td><strong>" +
          priceDisplay +
          "</strong></td>",

          "<td>" +
          stockBadge +
          "</td>",

          "<td>" +
          statusBadge +
          "</td>",

          '<td style="text-align:right;white-space:nowrap;">',

          '<button class="btn btn--outline btn--sm edit-product-btn" data-id="' +
          p.id +
          '">Edit</button>',

          '<button class="btn btn--outline btn--sm toggle-stock-btn" data-id="' +
          p.id +
          '">' +
          (isInStock
            ? "Mark Out of Stock"
            : "Mark In Stock") +
          "</button>",

          '<button class="btn btn--outline btn--sm toggle-visible-btn" data-id="' +
          p.id +
          '">' +
          (isVisible
            ? "Hide"
            : "Show") +
          "</button>",

          '<button class="btn btn--danger-outline btn--sm delete-product-btn" data-id="' +
          p.id +
          '">Delete</button>',

          "</td>",

          "</tr>"
        ].join("\n");
      }).join("\n");

    tbody.innerHTML = html;

    tbody
      .querySelectorAll(".edit-product-btn")
      .forEach(function (btn) {
        btn.addEventListener("click", function () {
          openEditProductModal(
            btn.dataset.id
          );
        });
      });

    tbody
      .querySelectorAll(".toggle-stock-btn")
      .forEach(function (btn) {
        btn.addEventListener("click", function () {
          toggleProductStock(
            btn.dataset.id
          );
        });
      });

    tbody
      .querySelectorAll(".toggle-visible-btn")
      .forEach(function (btn) {
        btn.addEventListener("click", function () {
          toggleProductVisibility(
            btn.dataset.id
          );
        });
      });

    tbody
      .querySelectorAll(".delete-product-btn")
      .forEach(function (btn) {
        btn.addEventListener("click", function () {
          deleteProduct(
            btn.dataset.id
          );
        });
      });
  }

  /* =========================================================
     PRODUCT MODAL
  ========================================================= */

  function setupProductModal() {
    var modal =
      document.getElementById(
        "productModal"
      );

    var openBtn =
      document.getElementById(
        "openAddProductModalBtn"
      );

    var closeBtn =
      document.getElementById(
        "closeProductModalBtn"
      );

    var cancelBtn =
      document.getElementById(
        "cancelProductModalBtn"
      );

    var form =
      document.getElementById(
        "productModalForm"
      );

    var imgFile =
      document.getElementById(
        "pmImageFile"
      );

    var imgUrl =
      document.getElementById(
        "pmImageUrl"
      );

    var imgPreview =
      document.getElementById(
        "pmImagePreview"
      );

    function closeModal() {
      if (modal) {
        modal.style.display = "none";
      }

      if (form) {
        form.reset();
      }

      if (imgPreview) {
        imgPreview.src =
          "assets/images/camera-product-shot.jpg";
      }
    }

    if (openBtn) {
      openBtn.addEventListener(
        "click",
        function () {
          if (form) {
            form.reset();
          }

          document.getElementById(
            "pmProductId"
          ).value = "";

          document.getElementById(
            "productModalTitle"
          ).textContent =
            "Add New Product";

          document.getElementById(
            "pmVisible"
          ).checked = true;

          var stockCheckbox =
            document.getElementById(
              "pmInStock"
            );

          if (stockCheckbox) {
            stockCheckbox.checked = true;
          }

          if (imgPreview) {
            imgPreview.src =
              "assets/images/camera-product-shot.jpg";
          }

          if (modal) {
            modal.style.display = "flex";
          }
        }
      );
    }

    if (closeBtn) {
      closeBtn.addEventListener(
        "click",
        closeModal
      );
    }

    if (cancelBtn) {
      cancelBtn.addEventListener(
        "click",
        closeModal
      );
    }

    /* Image Preview */

    if (imgFile) {
      imgFile.addEventListener(
        "change",
        function () {
          if (
            imgFile.files &&
            imgFile.files[0]
          ) {
            var reader =
              new FileReader();

            reader.onload =
              function (e) {
                if (imgPreview) {
                  imgPreview.src =
                    e.target.result;
                }
              };

            reader.readAsDataURL(
              imgFile.files[0]
            );
          }
        }
      );
    }

    if (imgUrl) {
      imgUrl.addEventListener(
        "input",
        function () {
          if (
            imgUrl.value.trim() &&
            imgPreview
          ) {
            imgPreview.src =
              imgUrl.value.trim();
          }
        }
      );
    }

    /* ADD / EDIT PRODUCT */

    if (form) {
      form.addEventListener(
        "submit",
        async function (e) {
          e.preventDefault();

          var saveBtn =
            document.getElementById(
              "saveProductBtn"
            );

          saveBtn.disabled = true;
          saveBtn.textContent =
            "Saving...";

          var productId =
            document.getElementById(
              "pmProductId"
            ).value;

          var name =
            document.getElementById(
              "pmName"
            ).value.trim();

          var price =
            document.getElementById(
              "pmPrice"
            ).value.trim();

          var description =
            document.getElementById(
              "pmDescription"
            ).value.trim();

          var specifications =
            document.getElementById(
              "pmSpecifications"
            ).value.trim();

          var visible =
            document.getElementById(
              "pmVisible"
            ).checked;

          var stockCheckbox =
            document.getElementById(
              "pmInStock"
            );

          var inStock =
            stockCheckbox
              ? stockCheckbox.checked
              : true;

          var imageUrl =
            imgUrl
              ? imgUrl.value.trim()
              : "";

          try {
            /*
              PRODUCT IMAGE UPLOAD

              Bucket:
              netwatch

              Folder:
              uploads/products
            */

            if (
              imgFile &&
              imgFile.files &&
              imgFile.files[0]
            ) {
              imageUrl =
                await uploadFileToStorage(
                  imgFile.files[0],
                  "uploads/products"
                );
            }

            /*
              If editing and no new image
              was selected, keep old image.
            */

            if (
              productId &&
              !imageUrl
            ) {
              var oldProduct =
                currentProducts.find(
                  function (item) {
                    return (
                      String(item.id) ===
                      String(productId)
                    );
                  }
                );

              if (oldProduct) {
                imageUrl =
                  oldProduct.image || "";
              }
            }

            var productData = {
              name: name,
              price: price,
              description: description,
              specifications: specifications,
              image: imageUrl,
              visible: visible,
              in_stock: inStock
            };

            var result;

            /* ADD */

            if (!productId) {
              result =
                await supabaseClient
                  .from("products")
                  .insert(productData)
                  .select()
                  .single();
            }

            /* EDIT */

            else {
              result =
                await supabaseClient
                  .from("products")
                  .update(productData)
                  .eq("id", productId)
                  .select()
                  .single();
            }

            if (result.error) {
              throw result.error;
            }

            closeModal();

            showToast(
              productId
                ? "Product updated successfully!"
                : "Product added successfully!",
              "success"
            );

            loadProducts();

          } catch (err) {
            console.error(
              "Product save error:",
              err
            );

            showToast(
              err.message ||
              "Error saving product.",
              "error"
            );

          } finally {
            saveBtn.disabled = false;
            saveBtn.textContent =
              "Save Product";
          }
        }
      );
    }
  }

  /* =========================================================
     EDIT PRODUCT
  ========================================================= */

  function openEditProductModal(id) {
    var p =
      currentProducts.find(
        function (item) {
          return (
            String(item.id) ===
            String(id)
          );
        }
      );

    if (!p) return;

    document.getElementById(
      "pmProductId"
    ).value = p.id;

    document.getElementById(
      "pmName"
    ).value = p.name || "";

    document.getElementById(
      "pmPrice"
    ).value = p.price || "";

    document.getElementById(
      "pmDescription"
    ).value =
      p.description || "";

    document.getElementById(
      "pmSpecifications"
    ).value =
      p.specifications || "";

    document.getElementById(
      "pmVisible"
    ).checked =
      p.visible !== false;

    var stockCheckbox =
      document.getElementById(
        "pmInStock"
      );

    if (stockCheckbox) {
      stockCheckbox.checked =
        p.in_stock !== false;
    }

    document.getElementById(
      "pmImageUrl"
    ).value = "";

    document.getElementById(
      "pmImagePreview"
    ).src =
      p.image ||
      "assets/images/camera-product-shot.jpg";

    document.getElementById(
      "productModalTitle"
    ).textContent =
      "Edit Product";

    document.getElementById(
      "productModal"
    ).style.display =
      "flex";
  }

  /* =========================================================
     TOGGLE STOCK
  ========================================================= */

  async function toggleProductStock(id) {
    var p =
      currentProducts.find(
        function (item) {
          return (
            String(item.id) ===
            String(id)
          );
        }
      );

    if (!p) return;

    var newStock =
      p.in_stock === false;

    var result =
      await supabaseClient
        .from("products")
        .update({
          in_stock: newStock
        })
        .eq("id", id);

    if (result.error) {
      console.error(
        result.error
      );

      showToast(
        "Could not update stock.",
        "error"
      );

      return;
    }

    showToast(
      newStock
        ? "Product marked In Stock."
        : "Product marked Out of Stock.",
      "success"
    );

    loadProducts();
  }

  /* =========================================================
     TOGGLE VISIBILITY
  ========================================================= */

  async function toggleProductVisibility(id) {
    var p =
      currentProducts.find(
        function (item) {
          return (
            String(item.id) ===
            String(id)
          );
        }
      );

    if (!p) return;

    var newVisibility =
      p.visible === false;

    var result =
      await supabaseClient
        .from("products")
        .update({
          visible: newVisibility
        })
        .eq("id", id);

    if (result.error) {
      console.error(
        result.error
      );

      showToast(
        "Could not update visibility.",
        "error"
      );

      return;
    }

    showToast(
      "Product visibility updated.",
      "success"
    );

    loadProducts();
  }

  /* =========================================================
     DELETE PRODUCT
  ========================================================= */

  async function deleteProduct(id) {
    if (
      !confirm(
        "Are you sure you want to delete this product?"
      )
    ) {
      return;
    }

    var result =
      await supabaseClient
        .from("products")
        .delete()
        .eq("id", id);

    if (result.error) {
      console.error(
        "Delete product error:",
        result.error
      );

      showToast(
        "Could not delete product.",
        "error"
      );

      return;
    }

    showToast(
      "Product deleted.",
      "success"
    );

    loadProducts();
  }

  /* =========================================================
     GALLERY MANAGEMENT
  ========================================================= */

  function setupGalleryActions() {
    var form =
      document.getElementById(
        "uploadGalleryForm"
      );

    if (!form) return;

    form.addEventListener(
      "submit",
      async function (e) {
        e.preventDefault();

        var fileInput =
          document.getElementById(
            "galleryFile"
          );

        if (
          !fileInput.files ||
          fileInput.files.length === 0
        ) {
          showToast(
            "Please select an image file.",
            "error"
          );

          return;
        }

        var btn =
          document.getElementById(
            "uploadGalleryBtn"
          );

        btn.disabled = true;
        btn.textContent =
          "Uploading...";

        try {
          /*
            Gallery image:

            netwatch
            └── uploads
                └── gallery
          */

          var imageUrl =
            await uploadFileToStorage(
              fileInput.files[0],
              "uploads/gallery"
            );

          var result =
            await supabaseClient
              .from("gallery")
              .insert({
                image: imageUrl,

                caption:
                  document.getElementById(
                    "galleryCaption"
                  ).value,

                span:
                  document.getElementById(
                    "gallerySpan"
                  ).value
              })
              .select()
              .single();

          if (result.error) {
            throw result.error;
          }

          form.reset();

          showToast(
            "Gallery image uploaded!",
            "success"
          );

          loadGallery();

        } catch (err) {
          console.error(
            "Gallery upload error:",
            err
          );

          showToast(
            err.message ||
            "Upload failed.",
            "error"
          );

        } finally {
          btn.disabled = false;
          btn.textContent =
            "Upload to Gallery";
        }
      }
    );
  }

  /* =========================================================
     RENDER GALLERY
  ========================================================= */

  function renderGalleryGrid(items) {
    var container =
      document.getElementById(
        "adminGalleryGrid"
      );

    if (!container) return;

    if (items.length === 0) {
      container.innerHTML =
        '<p style="color:var(--admin-soft);">No gallery images available.</p>';

      return;
    }

    var html =
      items.map(function (g) {
        return [
          '<div class="admin-gallery-card">',

          '  <img src="' +
          escapeHtml(g.image) +
          '" alt="Gallery Image">',

          '  <div class="admin-gallery-card__body">',

          '    <span class="admin-gallery-card__caption" title="' +
          escapeHtml(
            g.caption || ""
          ) +
          '">' +
          escapeHtml(
            g.caption ||
            "No caption"
          ) +
          "</span>",

          '    <button class="btn btn--danger-outline btn--sm delete-gallery-btn" data-id="' +
          g.id +
          '">&times; Delete</button>',

          "  </div>",

          "</div>"
        ].join("\n");
      }).join("\n");

    container.innerHTML = html;

    container
      .querySelectorAll(
        ".delete-gallery-btn"
      )
      .forEach(function (btn) {
        btn.addEventListener(
          "click",
          function () {
            deleteGalleryItem(
              btn.dataset.id
            );
          }
        );
      });
  }

  /* =========================================================
     DELETE GALLERY
  ========================================================= */

  async function deleteGalleryItem(id) {
    if (
      !confirm(
        "Are you sure you want to delete this gallery photo?"
      )
    ) {
      return;
    }

    var result =
      await supabaseClient
        .from("gallery")
        .delete()
        .eq("id", id);

    if (result.error) {
      console.error(
        "Delete gallery error:",
        result.error
      );

      showToast(
        "Could not delete gallery item.",
        "error"
      );

      return;
    }

    showToast(
      "Gallery item deleted.",
      "success"
    );

    loadGallery();
  }

  /* =========================================================
     VIDEO MANAGEMENT
  ========================================================= */

  function setupVideoActions() {
    var form =
      document.getElementById(
        "videoForm"
      );

    if (!form) return;

    form.addEventListener(
      "submit",
      async function (e) {
        e.preventDefault();

        var saveBtn =
          document.getElementById(
            "saveVideoBtn"
          );

        saveBtn.disabled = true;
        saveBtn.textContent =
          "Saving...";

        try {
          var eyebrow =
            document.getElementById(
              "videoEyebrow"
            ).value;

          var title =
            document.getElementById(
              "videoTitle"
            ).value;

          var videoInput =
            document.getElementById(
              "videoFile"
            );

          var posterInput =
            document.getElementById(
              "posterFile"
            );

          var videoFile =
            videoInput &&
              videoInput.files
              ? videoInput.files[0]
              : null;

          var posterFile =
            posterInput &&
              posterInput.files
              ? posterInput.files[0]
              : null;

          var videoUrl =
            currentVideo.url || "";

          var posterUrl =
            currentVideo.poster || "";

          /* VIDEO */

          if (videoFile) {
            videoUrl =
              await uploadFileToStorage(
                videoFile,
                "uploads/videos"
              );
          }

          /* POSTER */

          if (posterFile) {
            posterUrl =
              await uploadFileToStorage(
                posterFile,
                "uploads/videos"
              );
          }

          var result =
            await supabaseClient
              .from("video")
              .upsert(
                {
                  id: 1,
                  eyebrow: eyebrow,
                  title: title,
                  url: videoUrl,
                  poster: posterUrl
                },
                {
                  onConflict: "id"
                }
              )
              .select()
              .single();

          if (result.error) {
            throw result.error;
          }

          showToast(
            "Video settings saved!",
            "success"
          );

          loadVideo();

        } catch (err) {
          console.error(
            "Video save error:",
            err
          );

          showToast(
            err.message ||
            "Failed to update video.",
            "error"
          );

        } finally {
          saveBtn.disabled = false;
          saveBtn.textContent =
            "Save Video Changes";
        }
      }
    );
  }

  /* =========================================================
     SITE CONTENT
  ========================================================= */

  function setupContentActions() {
    var form =
      document.getElementById(
        "siteContentForm"
      );

    if (!form) return;

    form.addEventListener(
      "submit",
      async function (e) {
        e.preventDefault();

        var btn =
          document.getElementById(
            "saveContentBtn"
          );

        btn.disabled = true;
        btn.textContent =
          "Saving...";

        try {
          var payload = {
            id: 1,

            heroEyebrow:
              document.getElementById(
                "contentHeroEyebrow"
              ).value,

            heroTitle:
              document.getElementById(
                "contentHeroTitle"
              ).value,

            heroSubtitle:
              document.getElementById(
                "contentHeroSubtitle"
              ).value,

            aboutTitle:
              document.getElementById(
                "contentAboutTitle"
              ).value,

            aboutLead:
              document.getElementById(
                "contentAboutLead"
              ).value,

            whatsapp:
              document.getElementById(
                "contentWhatsapp"
              ).value,

            instagram:
              document.getElementById(
                "contentInstagram"
              ).value,

            tiktok:
              document.getElementById(
                "contentTiktok"
              ).value,

            youtube:
              document.getElementById(
                "contentYoutube"
              ).value
          };

          var result =
            await supabaseClient
              .from("site_content")
              .upsert(
                payload,
                {
                  onConflict: "id"
                }
              )
              .select()
              .single();

          if (result.error) {
            throw result.error;
          }

          currentContent =
            result.data || payload;

          showToast(
            "Website content updated!",
            "success"
          );

          loadSiteContent();

        } catch (err) {
          console.error(
            "Content update error:",
            err
          );

          showToast(
            err.message ||
            "Error updating content.",
            "error"
          );

        } finally {
          btn.disabled = false;
          btn.textContent =
            "Save All Website Content";
        }
      }
    );
  }

  /* =========================================================
     CHANGE PASSWORD
  ========================================================= */

  function setupSecurityActions() {
    var form =
      document.getElementById(
        "changePasswordForm"
      );

    if (!form) return;

    form.addEventListener(
      "submit",
      async function (e) {
        e.preventDefault();

        var newPassword =
          document.getElementById(
            "newPassword"
          ).value;

        var confirmPassword =
          document.getElementById(
            "confirmNewPassword"
          ).value;

        if (
          newPassword !==
          confirmPassword
        ) {
          showToast(
            "New passwords do not match.",
            "error"
          );

          return;
        }

        if (
          newPassword.length < 6
        ) {
          showToast(
            "Password must be at least 6 characters.",
            "error"
          );

          return;
        }

        var btn =
          document.getElementById(
            "changePasswordBtn"
          );

        btn.disabled = true;
        btn.textContent =
          "Changing Password...";

        try {
          var result =
            await supabaseClient.auth.updateUser(
              {
                password: newPassword
              }
            );

          if (result.error) {
            throw result.error;
          }

          form.reset();

          showToast(
            "Password changed successfully!",
            "success"
          );

        } catch (err) {
          console.error(
            "Password change error:",
            err
          );

          showToast(
            err.message ||
            "Error changing password.",
            "error"
          );

        } finally {
          btn.disabled = false;
          btn.textContent =
            "Change Password";
        }
      }
    );
  }

  /* =========================================================
     LOAD SITE CONTENT
  ========================================================= */

  async function loadSiteContent() {
    var result =
      await supabaseClient
        .from("site_content")
        .select("*")
        .eq("id", 1)
        .single();

    if (result.error) {
      console.error(
        "Site content error:",
        result.error
      );

      return;
    }

    currentContent =
      result.data || {};

    var c = currentContent;

    var heroEyebrow =
      document.getElementById(
        "contentHeroEyebrow"
      );

    var heroTitle =
      document.getElementById(
        "contentHeroTitle"
      );

    var heroSubtitle =
      document.getElementById(
        "contentHeroSubtitle"
      );

    var aboutTitle =
      document.getElementById(
        "contentAboutTitle"
      );

    var aboutLead =
      document.getElementById(
        "contentAboutLead"
      );

    var whatsapp =
      document.getElementById(
        "contentWhatsapp"
      );

    var instagram =
      document.getElementById(
        "contentInstagram"
      );

    var tiktok =
      document.getElementById(
        "contentTiktok"
      );

    var youtube =
      document.getElementById(
        "contentYoutube"
      );

    if (heroEyebrow)
      heroEyebrow.value =
        c.heroEyebrow || "";

    if (heroTitle)
      heroTitle.value =
        c.heroTitle || "";

    if (heroSubtitle)
      heroSubtitle.value =
        c.heroSubtitle || "";

    if (aboutTitle)
      aboutTitle.value =
        c.aboutTitle || "";

    if (aboutLead)
      aboutLead.value =
        c.aboutLead || "";

    if (whatsapp)
      whatsapp.value =
        c.whatsapp ||
        "03243249829";

    if (instagram)
      instagram.value =
        c.instagram ||
        "netwatchshop";

    if (tiktok)
      tiktok.value =
        c.tiktok ||
        "netwatchshop";

    if (youtube)
      youtube.value =
        c.youtube ||
        "NetWatch Technology";
  }

  /* =========================================================
     LOAD VIDEO
  ========================================================= */

  async function loadVideo() {
    var result =
      await supabaseClient
        .from("video")
        .select("*")
        .eq("id", 1)
        .single();

    if (result.error) {
      console.error(
        "Video error:",
        result.error
      );

      return;
    }

    currentVideo =
      result.data || {};

    var eyebrow =
      document.getElementById(
        "videoEyebrow"
      );

    var title =
      document.getElementById(
        "videoTitle"
      );

    if (eyebrow) {
      eyebrow.value =
        currentVideo.eyebrow || "";
    }

    if (title) {
      title.value =
        currentVideo.title || "";
    }

    var preview =
      document.getElementById(
        "adminVideoPreview"
      );

    if (
      preview &&
      currentVideo.url
    ) {
      preview.src =
        currentVideo.url;

      if (currentVideo.poster) {
        preview.poster =
          currentVideo.poster;
      }
    }
  }

  /* =========================================================
     LOAD GALLERY
  ========================================================= */

  async function loadGallery() {
    var result =
      await supabaseClient
        .from("gallery")
        .select("*")
        .order("created_at", {
          ascending: true
        });

    if (result.error) {
      console.error(
        "Gallery error:",
        result.error
      );

      return;
    }

    currentGallery =
      result.data || [];

    renderGalleryGrid(
      currentGallery
    );
  }

  /* =========================================================
     LOAD ALL DATA
  ========================================================= */

  async function loadPublicData() {
    await Promise.all([
      loadSiteContent(),
      loadVideo(),
      loadGallery()
    ]);
  }

  /* =========================================================
     SUPABASE STORAGE UPLOAD
  ========================================================= */

  async function uploadFileToStorage(
    file,
    folder
  ) {
    if (!file) {
      throw new Error(
        "No file selected."
      );
    }

    var safeName =
      file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "-"
      );

    var filePath =
      folder +
      "/" +
      Date.now() +
      "-" +
      Math.random()
        .toString(36)
        .substring(2, 8) +
      "-" +
      safeName;

    /*
      ONE BUCKET:

      netwatch
    */

    var uploadResult =
      await supabaseClient.storage
        .from("netwatch")
        .upload(
          filePath,
          file,
          {
            cacheControl: "3600",
            upsert: false
          }
        );

    if (uploadResult.error) {
      throw uploadResult.error;
    }

    var publicResult =
      supabaseClient.storage
        .from("netwatch")
        .getPublicUrl(
          filePath
        );

    if (
      !publicResult.data ||
      !publicResult.data.publicUrl
    ) {
      throw new Error(
        "Could not create public file URL."
      );
    }

    return publicResult.data.publicUrl;
  }

  /* =========================================================
     ESCAPE HTML
  ========================================================= */

  function escapeHtml(str) {
    if (!str) return "";

    return String(str)
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );
  }

  /* =========================================================
     START
  ========================================================= */

  checkAuthentication();

})();