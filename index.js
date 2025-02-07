const API = (() => {
  const URL = "http://localhost:3000";
  const getCart = () => {
    // define your method to get cart data
    return fetch(`${URL}/cart`).then((res) => res.json());
  };

  const getInventory = () => {
    // define your method to get inventory data
    return fetch(`${URL}/inventory`).then((res) => res.json());
  };

  const addToCart = (inventoryItem) => {
    // define your method to add an item to cart
    return fetch(`${URL}/cart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(inventoryItem),
    }).then((res) => res.json());
  };

  const updateCart = (id, newAmount) => {
    // define your method to update an item in cart
    return fetch(`${URL}/cart/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: newAmount }),
    }).then((res) => res.json());
  };

  const deleteFromCart = (id) => {
    // define your method to delete an item in cart
    return fetch(`${URL}/cart/${id}`, {
      method: "DELETE",
    }).then((res) => res.json());
  };

  const checkout = () => {
    // you don't need to add anything here
    return getCart().then((data) =>
      Promise.all(data.map((item) => deleteFromCart(item.id)))
    );
  };

  return {
    getCart,
    updateCart,
    getInventory,
    addToCart,
    deleteFromCart,
    checkout,
  };
})();

const Model = (() => {
  // implement your logic for Model
  class State {
    #onChange;
    #inventory;
    #cart;
    constructor() {
      this.#inventory = [];
      this.#cart = [];
    }
    get cart() {
      return this.#cart;
    }

    get inventory() {
      return this.#inventory;
    }

    set cart(newCart) {
      this.#cart = newCart;
      this.#onChange();
    }
    set inventory(newInventory) {
      this.#inventory = newInventory;
      this.#onChange();
    }

    subscribe(cb) {
      this.#onChange = cb;
    }
  }

  return {
    State,
    ...API,
  };
})();

const View = (() => {
  // implement your logic for View
  const cartListEl = document.querySelector(".cart__list");
  const inventoryListEl = document.querySelector(".inventory__list");
  const checkoutBtn = document.querySelector(".checkout-btn");

  const renderInventory = (inventory) => {
    inventoryListEl.innerHTML = "";
    inventory.forEach((item) => {
      const li = document.createElement("li");
      li.className = "inventory-item";
      li.dataset.id = item.id;
      li.innerHTML = `
        <span class="item-content">${item.content}</span>
        <div class="controls">
          <button class="minus">-</button>
          <span class="selected-amount">0</span>
          <button class="plus">+</button>
          <button class="add-to-cart">Add to Cart</button>
        </div>
      `;
      inventoryListEl.appendChild(li);
    });
  };

  const renderCart = (cart) => {
    cartListEl.innerHTML = "";
    cart.forEach((item) => {
      const li = document.createElement("li");
      li.dataset.id = item.id;
      li.dataset.className = "cart-item";
      li.innerHTML = `
        <span class="item-content">${item.content}</span>
        <span class="item-amount">x</span>
        <span class="item-amount">${item.amount}</span>
        <div class="controls">
          <button class="delete">Delete</button>
          <button class="edit">Edit</button>
        </div>
      `;
      cartListEl.appendChild(li);
    });
  };

  const renderCartEditMode = (li, item) => {
    li.classList.add("editing");
    li.innerHTML = `
      <span class="item-content">${item.content}</span>
      <div class="controls">
        <button class="minus-edit">-</button>
        <span class="edit-amount">${item.amount}</span>
        <button class="plus-edit">+</button>
        <button class="save-edit">Save</button>
      </div>
    `;
  };

  const bindInventoryEvents = (handleAddToCart) => {
    inventoryListEl.addEventListener("click", (e) => {
      e.preventDefault();
      const li = e.target.closest("li");
      if (!li) return;
      const selectedAmountEl = li.querySelector(".selected-amount");
      let currentAmount = parseInt(selectedAmountEl.textContent);

      if (e.target.classList.contains("plus")) {
        currentAmount++;
        selectedAmountEl.textContent = currentAmount;
      } else if (e.target.classList.contains("minus")) {
        if (currentAmount > 0) {
          currentAmount--;
          selectedAmountEl.textContent = currentAmount;
        }
      } else if (e.target.classList.contains("add-to-cart")) {
        const id = li.dataset.id;
        const content = li.querySelector(".item-content").textContent;
        if (currentAmount > 0) {
          handleAddToCart({ id: parseInt(id), content, amount: currentAmount });
          selectedAmountEl.textContent = "0";
        }
      }
    });
  };

  const bindCartEvents = (
    handleDelete,
    handleEdit,
    handleUpdateCartItem,
    handleCancelEdit
  ) => {
    cartListEl.addEventListener("click", (e) => {
      e.preventDefault();
      const li = e.target.closest("li");
      if (!li) return;
      const id = li.dataset.id;

      if (e.target.classList.contains("delete")) {
        handleDelete(parseInt(id));
      } else if (e.target.classList.contains("edit")) {
        handleEdit(parseInt(id));
      } else if (e.target.classList.contains("plus-edit")) {
        const editAmountEl = li.querySelector(".edit-amount");
        let amount = parseInt(editAmountEl.textContent);
        amount++;
        editAmountEl.textContent = amount;
      } else if (e.target.classList.contains("minus-edit")) {
        const editAmountEl = li.querySelector(".edit-amount");
        let amount = parseInt(editAmountEl.textContent);
        if (amount > 0) {
          amount--;
          editAmountEl.textContent = amount;
        }
      } else if (e.target.classList.contains("save-edit")) {
        const newAmount = parseInt(li.querySelector(".edit-amount").textContent);
        handleUpdateCartItem(parseInt(id), newAmount);
      } else if (e.target.classList.contains("cancel-edit")) {
        handleCancelEdit();
      }
    });
  };

  const bindCheckoutEvent = (handleCheckout) => {
    checkoutBtn.addEventListener("click", handleCheckout);
  };

  return {
    renderInventory,
    renderCart,
    renderCartEditMode,
    bindInventoryEvents,
    bindCartEvents,
    bindCheckoutEvent,
  };
})();

const Controller = ((Model, View) => {
  const state = new Model.State();

  const loadData = async () => {
    try {
      const inventoryData = await Model.getInventory();
      const cartData = await Model.getCart();
      state.inventory = inventoryData;
      state.cart = cartData;
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  state.subscribe(() => {
    View.renderInventory(state.inventory);
    View.renderCart(state.cart);
  }); 


  const handleAddToCart = async (item) => {
    try {
      const existingItem = state.cart.find((cartItem) => cartItem.id === item.id);
      if (existingItem) {
        const newAmount = existingItem.amount + item.amount;
        await Model.updateCart(existingItem.id, newAmount);
      } else {
        await Model.addToCart(item);
      }
      const newCartData = await Model.getCart();
      state.cart = newCartData;
    } catch (error) {
      console.log("Error adding item to cart", error);
    }
  };

  const handleDeleteCartItem = async (id) => {
    try {
      await Model.deleteFromCart(id);
      const cartData = await Model.getCart();
      state.cart = cartData;
    } catch (error) {
      console.error("Error deleting cart item:", error);
    }
  };

  const handleEditCartItem = (id) => {
    const li = document.querySelector(`.cart__list li[data-id="${id}"]`);
    if (!li) return;
    const item = state.cart.find((item) => item.id === id);
    if (!item) return;
    View.renderCartEditMode(li, item);
  };

  const handleUpdateCartItem = async (id, newAmount) => {
    try {
      await Model.updateCart(id, newAmount);
      const cartData = await Model.getCart();
      state.cart = cartData;
    } catch (error) {
      console.error("Error updating cart item:", error);
    }
  };

  const handleCancelEdit = () => {
    View.renderCart(state.cart);
  };

  const handleCheckout = async () => {
    try {
      await Model.checkout();
      const cartData = await Model.getCart();
      state.cart = cartData;
    } catch (error) {
      console.error("Error during checkout:", error);
    }
  };

  const bindEvents = () => {
    View.bindInventoryEvents(handleAddToCart);
    View.bindCartEvents(
      handleDeleteCartItem,
      handleEditCartItem,
      handleUpdateCartItem,
      handleCancelEdit
    );
    View.bindCheckoutEvent(handleCheckout);
  };

  const init = () => {
    loadData();
    bindEvents();
  };

  return {
    init,
  };
})(Model, View);

Controller.init();